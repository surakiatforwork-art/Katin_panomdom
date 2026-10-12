(() => {
  "use strict";
  const status = document.getElementById("data-status");
  const button = document.getElementById("refresh-names");
  const config = window.KATHIN_CONFIG;
  const reference = window.KATHIN_DATA.groups;
  let loading = false;
  const nameCount = () => window.KATHIN_DATA.groups.reduce((total,g) => total + g.sections.reduce((sum,s) => sum + s.entries.length,0),0);
  function validate(payload) {
    if (!payload?.ok) throw new Error(payload?.error || "API ไม่พร้อมใช้งาน");
    const data = payload.data;
    if (!Array.isArray(data?.groups) || data.groups.length !== reference.length) throw new Error("ข้อมูลสายไม่ครบ");
    let count = 0;
    data.groups.forEach((g,i) => {
      if (g.title !== reference[i].title || !Array.isArray(g.sections) || g.sections.length !== reference[i].sections.length) throw new Error("โครงสร้างสายไม่ถูกต้อง");
      g.sections.forEach((s,j) => {
        if (s.title !== reference[i].sections[j].title || !Array.isArray(s.entries)) throw new Error("ตำแหน่งไม่ถูกต้อง");
        s.entries.forEach((entry,k) => {
          if (typeof entry.text !== "string" || !entry.text.startsWith((k+1)+".") || !entry.text.slice(String(k+1).length+1).trim()) throw new Error("รูปแบบชื่อไม่ถูกต้อง");
          count++;
        });
      });
    });
    if (count > 5000) throw new Error("รายชื่อมากเกินขนาดโปสเตอร์");
    return {data,count};
  }
  function request(url) {
    return new Promise((resolve,reject) => {
      const callback = "kathin_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const cleanup = () => {
        clearTimeout(timer);
        script.remove();
        // A late Google response must not throw after a timeout.
        window[callback] = () => {};
        setTimeout(() => delete window[callback],60000);
      };
      window[callback] = payload => { cleanup(); resolve(payload); };
      const timer = setTimeout(() => { cleanup(); reject(new Error("เชื่อมต่อชีทไม่สำเร็จ")); },15000);
      script.onerror = () => { cleanup(); reject(new Error("เชื่อมต่อชีทไม่สำเร็จ")); };
      url.searchParams.set("callback",callback);
      url.searchParams.set("_",Date.now());
      script.src = url.href;
      document.head.append(script);
    });
  }
  async function refresh() {
    if (loading) return;
    if (document.querySelector("#export-dialog")?.open) {
      status.textContent = "กรุณาปิดหน้าดาวน์โหลดก่อนอัปเดตรายชื่อ";
      return;
    }
    if (!config?.apiUrl) {
      status.textContent = "รายชื่อผู้ร่วมทำบุญ · " + nameCount() + " รายการ";
      return;
    }
    loading = true;
    button.disabled = true;
    status.textContent = "กำลังอัปเดตรายชื่อ…";
    try {
      const url = new URL(config.apiUrl);
      if (url.origin !== "https://script.google.com" || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) throw new Error("URL API ไม่ถูกต้อง");
      const result = validate(await request(url));
      // Keep an open export dialog consistent with its preview.
      if (document.querySelector("#export-dialog")?.open) {
        status.textContent = "กรุณาปิดหน้าดาวน์โหลด แล้วกดอัปเดตรายชื่ออีกครั้ง";
        return;
      }
      window.dispatchEvent(new CustomEvent("kathin-data",{detail:result.data}));
      status.textContent = "รายชื่อผู้ร่วมทำบุญ · " + result.count + " รายการ";
    } catch (error) {
      status.textContent = "อัปเดตไม่สำเร็จ ขณะนี้ยังแสดงรายชื่อชุดเดิม";
    } finally {
      loading = false;
      button.disabled = false;
    }
  }
  button.addEventListener("click",refresh);
  refresh();
})();
