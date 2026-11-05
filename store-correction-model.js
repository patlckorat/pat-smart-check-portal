(function (root) {
  'use strict';
  function prepare(parsed, template) {
    const rows = parsed.rows.filter(r => String(r.values['รหัสร้านใหม่'] || '').trim());
    if (!rows.length) throw Error('ยังไม่มีแถวที่กรอกรหัสร้านใหม่');
    if (rows.length > 100) throw Error('แก้ไขได้ครั้งละไม่เกิน 100 รายการ');
    const seen = new Set();
    return rows.map(row => {
      const v = row.values;
      const code = String(v['รหัสนักเรียน'] || '').trim();
      const store = String(v['รหัสร้านใหม่'] || '').trim();
      const assignment = String(v['รหัสรายการเดิม'] || '').trim();
      let body = null, error = '';
      const candidates = template.assignments.filter(a => a.code === code && a.assignment_id === assignment);
      const old = candidates[0];
      try {
        if (candidates.length !== 1) throw Error('ไม่พบช่วงร้านเดิมที่ยังไม่เริ่ม หรือรหัสรายการซ้ำ กรุณาโหลดไฟล์ใหม่');
        const key = old.id + ':' + assignment;
        if (seen.has(key)) throw Error('มีรายการเดิมซ้ำในไฟล์');
        seen.add(key);
        const from = PATExcel.date(v['วันเริ่ม'], parsed.date1904);
        const to = PATExcel.date(v['วันสุดท้าย'], parsed.date1904);
        if (from !== old.from || to !== old.to || String(v['ร้านเดิม']).trim() !== old.old_code) {
          throw Error('ร้านเดิมหรือวันที่ไม่ตรงกับข้อมูลล่าสุด กรุณาดาวน์โหลดไฟล์ใหม่');
        }
        const stores = template.stores.filter(s => s.code === store);
        if (stores.length !== 1) throw Error('รหัสร้านใหม่ไม่ถูกต้องหรือซ้ำ กรุณาดูแท็บ STORES');
        if (stores[0].id === old.store_id) throw Error('ร้านใหม่ตรงกับร้านเดิม ให้เว้นรหัสร้านใหม่เพื่อข้าม');
        const reason = String(v['เหตุผล'] || '').trim();
        if (reason.length < 3 || reason.length > 500) throw Error('กรุณาระบุเหตุผล 3–500 ตัวอักษร');
        body = {student_id:old.id, kind:'CORRECT', assignment_id:assignment, expected_store_id:old.store_id, store_id:stores[0].id, from, to, reason};
      } catch (e) { error = e.message; }
      return {row:row.row, code, name:old?.name || '', oldStore:old ? old.old_code+' '+old.old_name : String(v['ร้านเดิม']||''), store, body, error, status:error ? 'INVALID' : 'NEW'};
    });
  }
  root.PATStoreCorrections = {prepare};
})(window);
