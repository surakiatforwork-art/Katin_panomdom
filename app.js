(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const data = window.KATHIN_DATA;
  const poster = $("poster");
  const stage = $("stage");
  const sizer = $("poster-sizer");
  const dialog = $("export-dialog");
  const status = $("export-status");
  const saveButton = $("save-export");
  document.querySelector(".poster-header").style.backgroundImage = `url("${window.KATHIN_ART}")`;
  document.querySelector(".poster-footer").style.backgroundImage = `url("${window.KATHIN_FOOTER_ART}")`;
  let busy = false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motion = !reduced.matches;

  function list(entries) {
    const ol = document.createElement("ol");
    entries.forEach(({ text, sourceParagraph }) => {
      const li = document.createElement("li");
      li.dataset.sourceParagraph = sourceParagraph;
      const match = text.match(/^(\d+\.)(.*)$/);
      const number = document.createElement("span");
      number.className = "entry-number";
      number.textContent = match[1];
      const name = document.createElement("span");
      name.className = "entry-name";
      name.textContent = match[2];
      li.append(number, name);
      ol.append(li);
    });
    return ol;
  }

  function section(source, split = false) {
    const node = document.createElement("section");
    node.className =
      "role-section" +
      (source.title === "รองประธาน"
        ? " green"
        : source.title === "ประธาน"
          ? " blue"
          : "");
    const heading = document.createElement("h4");
    heading.textContent = source.title;
    node.append(heading);
    if (split) {
      const columns = document.createElement("div");
      columns.className = "split-entries";
      const middle = Math.ceil(source.entries.length / 2);
      columns.append(
        list(source.entries.slice(0, middle)),
        list(source.entries.slice(middle)),
      );
      node.append(columns);
    } else node.append(list(source.entries));
    return node;
  }

  function frame(group) {
    const node = document.createElement("section");
    node.className = "group-frame";
    const heading = document.createElement("h3");
    heading.className = "group-title";
    heading.textContent = group.title;
    node.append(heading);
    return node;
  }

  const main = frame(data.groups[0]);
  const columns = document.createElement("div");
  columns.className = "main-columns";
  const first = document.createElement("div");
  first.className = "section-column";
  first.append(section(data.groups[0].sections[0]));
  const presidents = section(data.groups[0].sections[1]);
  presidents.classList.add("stretch");
  first.append(presidents);
  columns.append(
    first,
    section(data.groups[0].sections[2]),
    section(data.groups[0].sections[3]),
  );
  main.append(columns);
  const bottom = document.createElement("div");
  bottom.className = "bottom-groups";
  data.groups.slice(1).forEach((group, index) => {
    const node = frame(group);
    const sections = document.createElement("div");
    sections.className = "sections";
    group.sections.forEach((source) =>
      sections.append(
        section(source, index === 1 && source.title === "กรรมการ"),
      ),
    );
    node.append(sections);
    bottom.append(node);
  });
  $("groups").append(main, bottom);

  function fitPoster() {
    const available =
      stage.clientWidth -
      parseFloat(getComputedStyle(stage).paddingLeft) -
      parseFloat(getComputedStyle(stage).paddingRight);
    const scale = Math.min(1, available / 1200);
    poster.style.transform = `scale(${scale})`;
    sizer.style.width = `${1200 * scale}px`;
    sizer.style.height = `${poster.offsetHeight * scale}px`;
  }
  new ResizeObserver(fitPoster).observe(stage);
  document.fonts.ready.then(fitPoster);
  window.addEventListener("load", fitPoster);
  fitPoster();

  for (let i = 0; i < 32; i++) {
    const spark = document.createElement("i");
    spark.className = "spark";
    spark.style.left = `${3 + ((i * 31.7) % 94)}%`;
    spark.style.top = `${4 + ((i * 17.3) % 90)}%`;
    spark.style.setProperty("--duration", `${6 + (i % 7)}s`);
    spark.style.setProperty("--delay", `${-i * 0.67}s`);
    $("sparkles").append(spark);
  }
  function setMotion() {
    document.body.classList.toggle("still", !motion);
    $("motion-toggle").setAttribute("aria-pressed", String(motion));
    $("motion-label").textContent = motion ? "เอฟเฟกต์เปิด" : "เอฟเฟกต์ปิด";
  }
  $("motion-toggle").addEventListener("click", () => {
    motion = !motion;
    setMotion();
  });
  reduced.addEventListener("change", () => {
    motion = !reduced.matches;
    setMotion();
  });
  setMotion();
  stage.addEventListener("pointermove", (event) => {
    if (!motion || event.pointerType !== "mouse" || busy) return;
    const rect = stage.getBoundingClientRect();
    stage.style.setProperty(
      "--ry",
      `${((event.clientX - rect.left - rect.width / 2) / rect.width) * 2.2}deg`,
    );
    stage.style.setProperty(
      "--rx",
      `${(-(event.clientY - rect.top - rect.height / 2) / rect.height) * 1.2}deg`,
    );
  });
  stage.addEventListener("pointerleave", () => {
    stage.style.setProperty("--ry", "0deg");
    stage.style.setProperty("--rx", "0deg");
  });

  $("open-export").addEventListener("click", () => {
    status.textContent = "";
    status.classList.remove("error");
    dialog.showModal();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog && !busy) dialog.close();
  });
  dialog.addEventListener("cancel", (event) => {
    if (busy) event.preventDefault();
  });
  document.querySelectorAll('input[name="format"]').forEach((input) =>
    input.addEventListener("change", () => {
      saveButton.textContent = `ดาวน์โหลด ${input.value.toUpperCase()}`;
    }),
  );

  async function downloadBlob(blob, filename) {
    if (!blob) throw new Error("สร้างไฟล์ภาพไม่สำเร็จ");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    // Keep the URL alive long enough for mobile browsers to begin saving.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function exportPoster() {
    if (busy) return;
    const format = document.querySelector('input[name="format"]:checked').value;
    const scale = Number($("export-quality").value);
    busy = true;
    const controls = [
      ...dialog.querySelectorAll("button,input,select"),
      $("open-export"),
      $("motion-toggle"),
    ];
    controls.forEach((control) => {
      control.disabled = true;
    });
    status.classList.remove("error");
    status.textContent = "กำลังจัดเตรียมโปสเตอร์เต็มหน้า…";
    try {
      if (!window.html2canvas || !window.jspdf)
        throw new Error(
          "โหลดเครื่องมือดาวน์โหลดไม่สำเร็จ กรุณาเปิดหน้าเว็บใหม่",
        );
      await document.fonts.ready;
      // Decode the decorative background before cloning (including offline file use).
      await Promise.all([window.KATHIN_ART, window.KATHIN_FOOTER_ART].map(async (source) => {
        const art = new Image();
        art.src = source;
        await art.decode();
      }));
      const height = poster.offsetHeight;
      status.textContent = "กำลังสร้างไฟล์ความละเอียดสูง กรุณารอสักครู่…";
      const canvas = await window.html2canvas(poster, {
        scale,
        width: 1200,
        height,
        windowWidth: 1400,
        windowHeight: height + 100,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        backgroundColor: "#fff9e8",
        logging: false,
        onclone: (doc) => {
          const clone = doc.getElementById("poster");
          doc.body.classList.add("still");
          doc.body.append(clone);
          for (const child of doc.body.children)
            if (child !== clone) child.style.display = "none";
          Object.assign(doc.body.style, {
            margin: "0",
            padding: "0",
            width: "1200px",
            minWidth: "1200px",
            background: "#fff9e8",
          });
          Object.assign(clone.style, {
            transform: "none",
            position: "absolute",
            left: "0",
            top: "0",
            margin: "0",
            width: "1200px",
          });
          // html2canvas paints inset shadows as solid fills in some browsers.
          // Borders retain their gold outlines without these screen-only shadows.
          clone.querySelectorAll("*").forEach((node) => {
            node.style.boxShadow = "none";
          });
        },
      });
      const filename = "kathin-wat-khao-phanom-dom";
      if (format === "pdf") {
        const { jsPDF } = window.jspdf;
        const widthMm = 297;
        const heightMm = (widthMm * canvas.height) / canvas.width;
        const pdf = new jsPDF({
          orientation: heightMm > widthMm ? "portrait" : "landscape",
          unit: "mm",
          format: [widthMm, heightMm],
          compress: true,
        });
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.97),
          "JPEG",
          0,
          0,
          widthMm,
          heightMm,
        );
        pdf.setProperties({
          title: "กฐินสามัคคี วัดเขาพนมโดมวนาราม",
          subject: "รายชื่อผู้ร่วมทำบุญกฐินสามัคคี",
        });
        await downloadBlob(pdf.output("blob"), `${filename}.pdf`);
      } else {
        const mime = format === "jpg" ? "image/jpeg" : "image/png";
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, mime, 0.96),
        );
        await downloadBlob(blob, `${filename}.${format}`);
      }
      canvas.width = 0;
      canvas.height = 0;
      status.textContent = `สร้างไฟล์ ${format.toUpperCase()} สำเร็จ ตรวจสอบไฟล์ในรายการดาวน์โหลดของเบราว์เซอร์`;
    } catch (error) {
      console.error("Poster export failed:", error);
      status.classList.add("error");
      status.textContent = `ดาวน์โหลดไม่สำเร็จ: ${error.message} ลองเลือกความละเอียดมาตรฐานแล้วดาวน์โหลดอีกครั้ง`;
    } finally {
      busy = false;
      controls.forEach((control) => {
        control.disabled = false;
      });
      saveButton.textContent = `ดาวน์โหลด ${format.toUpperCase()}`;
    }
  }
  saveButton.addEventListener("click", exportPoster);
})();
