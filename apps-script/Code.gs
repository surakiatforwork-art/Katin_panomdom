/** Read-only public poster API. Notes are deliberately excluded. */
const SPREADSHEET_ID = "1c2gkItD39KFWOA0w7NifEEjSjJJMiay3kruieDBkB5o";
const GROUPS = [
  {
    "title": "สายคุณสท.ไพรัชต์ เข็มกลัด -คุณประภาพร ทองเนื้ออินทร์",
    "sections": [
      {
        "title": "ประธานอุปถัมภ์",
        "entries": []
      },
      {
        "title": "ประธาน",
        "entries": []
      },
      {
        "title": "รองประธาน",
        "entries": []
      },
      {
        "title": "กรรมการ",
        "entries": []
      }
    ]
  },
  {
    "title": "สายร.ต.อิทธิพล บัวด้วง – คุณฐิตามร ทองเนื้ออินทร์",
    "sections": [
      {
        "title": "ประธาน",
        "entries": []
      },
      {
        "title": "รองประธาน",
        "entries": []
      },
      {
        "title": "กรรมการ",
        "entries": []
      }
    ]
  },
  {
    "title": "สายคุณฐิติพร บุญชู (ร้านเสริมสวยคุณใจ)",
    "sections": [
      {
        "title": "ประธาน",
        "entries": []
      },
      {
        "title": "รองประธาน",
        "entries": []
      },
      {
        "title": "กรรมการ",
        "entries": []
      }
    ]
  }
];

function buildPosterData(rows) {
  const groups = JSON.parse(JSON.stringify(GROUPS));
  const errors = [];
  rows.forEach(function(row, index) {
    const name = String(row[3] || "").trim();
    if (!name || row[4] === false || String(row[4]).toUpperCase() === "FALSE") return;
    const group = groups.find(function(g) { return g.title === String(row[0]).trim(); });
    const section = group && group.sections.find(function(s) { return s.title === String(row[1]).trim(); });
    const order = Number(row[2]);
    if (!section || !Number.isFinite(order) || order < 1) {
      errors.push("แถว " + (index + 2) + ": ตรวจสอบสาย ตำแหน่ง และลำดับ");
      return;
    }
    section.entries.push({name: name, order: order, sheetRow: index + 2});
  });
  if (errors.length) throw new Error(errors.join("; "));
  let count = 0;
  groups.forEach(function(group) {
    group.sections.forEach(function(section) {
      section.entries.sort(function(a,b) { return a.order - b.order || a.sheetRow - b.sheetRow; });
      section.entries = section.entries.map(function(entry,index) {
        count++;
        return {text: (index + 1) + "." + entry.name, sheetRow: entry.sheetRow};
      });
    });
  });
  return {title:"รายชื่อผู้ร่วมทำบุญกฐินสามัคคี", source:"Google Sheets", groups:groups, count:count};
}

function doGet(e) {
  const callback = e && e.parameter && e.parameter.callback;
  if (callback && !/^[A-Za-z_$][A-Za-z0-9_$]{0,80}$/.test(callback)) {
    return ContentService.createTextOutput('{"ok":false,"error":"Invalid callback"}').setMimeType(ContentService.MimeType.JSON);
  }
  let payload;
  try {
    // This Sheet is already shared for public reading. No access to other
    // spreadsheets in the owner's account is requested.
    const url = "https://docs.google.com/spreadsheets/d/" + SPREADSHEET_ID + "/export?format=csv&gid=0";
    const response = UrlFetchApp.fetch(url, {muteHttpExceptions:true});
    if (response.getResponseCode() !== 200) throw new Error("อ่านชีทไม่สำเร็จ ตรวจสอบสิทธิ์อ่านลิงก์ชีท");
    const allRows = Utilities.parseCsv(response.getContentText("UTF-8").replace(/^\uFEFF/,""));
    const headers = ["สาย","ตำแหน่ง","ลำดับ","ชื่อและครอบครัว","แสดงบนเว็บ"];
    if (!headers.every(function(h,i) { return allRows[0] && allRows[0][i] === h; })) throw new Error("หัวคอลัมน์ชีทไม่ตรงกับฐานรายชื่อ");
    const rows = allRows.slice(1);
    payload = {ok:true, data:buildPosterData(rows), fetchedAt:new Date().toISOString()};
  } catch (error) {
    payload = {ok:false, error:String(error.message)};
  }
  const json = JSON.stringify(payload).replace(/</g,"\\u003c");
  return ContentService.createTextOutput(callback ? callback + "(" + json + ");" : json)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
