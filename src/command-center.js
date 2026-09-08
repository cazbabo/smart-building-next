export const incidentDefinitions=[
 {id:'CH-03',system:'plant',title:'Chiller 03 ต้องตรวจสอบ',location:'B2 → ชั้น 6–8',metric:'Chiller ΔT',unit:'°C',value:'9.8',normal:'6.2',severity:'critical',team:'ทีมวิศวกรรมอาคาร',impact:'วงจรน้ำเย็นที่จ่ายให้ AHU ชั้น 6–8',action:'ตรวจอัตราการไหลและวาล์ว แล้วประเมินการสลับเครื่องสำรอง'},
 {id:'IAQ-06',system:'comfort',title:'CO₂ ห้องประชุมสูง',location:'ชั้น 6 · ห้องประชุม 6A',metric:'CO₂',unit:'ppm',value:'1,040',normal:'684',severity:'warning',team:'ทีมระบบปรับอากาศ',impact:'คุณภาพอากาศในห้องประชุมที่มีผู้ใช้งาน 24 คน',action:'ตรวจเซนเซอร์และเพิ่ม Fresh Air ตามนโยบายห้องประชุม'},
 {id:'AC-01',system:'security',title:'พบการใช้สิทธิ์นอกเวลา',location:'Lobby · ประตู G-02',metric:'Access',unit:'',value:'DENIED',normal:'VERIFIED',severity:'warning',team:'ทีมรักษาความปลอดภัย',impact:'ผู้มาติดต่อถูกปฏิเสธที่ประตู G-02 โดยประตูยังคงล็อก',action:'ตรวจการนัดหมายและภาพเหตุการณ์ ก่อนออกสิทธิ์ใหม่ตามนโยบาย'}
];
const systemNames={energy:'Energy',comfort:'Comfort',workspace:'Workspace',security:'Security',parking:'Parking / EV',plant:'Plant'};
const stateLabel={open:'รอรับงาน',assigned:'กำลังดำเนินการ',resolved:'แก้ไขแล้ว'};
export function createIncidentStore(){
 const records=incidentDefinitions.map(d=>({...d,status:'open',history:['ระบบตรวจพบเหตุจำลอง']}));let selected=records[0].id;
 return {
  get records(){return records;},get selected(){return records.find(r=>r.id===selected);},
  select(id){if(records.some(r=>r.id===id))selected=id;},
  assign(){const r=this.selected;if(r.status!=='open')return false;r.status='assigned';r.history.push(`รับงานโดย${r.team}`);return true;},
  resolve(){const r=this.selected;if(r.status!=='assigned')return false;r.status='resolved';r.history.push(`ยืนยันค่าปกติ: ${r.normal} ${r.unit}`);return true;},
  get snapshot(){return {selected:this.selected,open:records.filter(r=>r.status!=='resolved').length,resolved:records.filter(r=>r.status==='resolved').length,records};},
  reset(){records.forEach(r=>{r.status='open';r.history=['ระบบตรวจพบเหตุจำลอง'];});selected=records[0].id;}
 };
}
export function createCommandCenter(root,onChange,onDetails){
 const store=createIncidentStore();
 root.innerHTML=`<div class="eyebrow"><span>08</span><span>COMMAND CENTER</span></div><h1>ทุกระบบ<br><em>อยู่ในสายตา</em></h1><p class="command-intro">ศูนย์กลางการมองเห็นและตอบสนอง<br>เลือกเหตุการณ์ เพื่อเริ่มปฏิบัติการจำลอง</p><div class="system-health" id="systemHealth"></div><div class="incident-heading"><h2>เหตุการณ์ที่ต้องดูแล</h2><span id="incidentCount"></span></div><div class="incident-list" id="incidentList"></div><div class="incident-actions"><button id="assignIncident">รับดำเนินการ</button><button id="resolveIncident">จำลองแก้ไข</button></div><div class="incident-detail" id="incidentDetail" aria-live="polite"></div><div class="command-links"><button id="commandDetail">เจาะลึก Command Center ↗</button><button id="resetIncidents">รีเซ็ตเดโม</button></div>`;
 const q=s=>root.querySelector(s);
 function render(){
  const snapshot=store.snapshot,r=snapshot.selected;
  q('#systemHealth').innerHTML=Object.entries(systemNames).map(([key,label])=>{const issue=snapshot.records.find(x=>x.system===key&&x.status!=='resolved');return `<span class="health-item ${issue?issue.severity:'normal'}"><i></i>${label}</span>`;}).join('');
  q('#incidentCount').textContent=`${snapshot.open} รอดำเนินการ`;
  q('#incidentList').innerHTML=snapshot.records.map(item=>`<button class="incident-row ${item.id===r.id?'selected':''}" data-incident="${item.id}" aria-pressed="${item.id===r.id}"><i class="severity ${item.status==='resolved'?'normal':item.severity}"></i><span><b>${item.title}</b><small>${item.location}</small></span><span class="incident-state ${item.status}">${stateLabel[item.status]}</span></button>`).join('');
  q('#incidentDetail').innerHTML=`<div class="incident-value"><span>${r.metric}<small>${r.id} · ข้อมูลจำลอง</small></span><strong>${r.status==='resolved'?r.normal:r.value}<small>${r.unit}</small></strong></div><p><b>พื้นที่ / ผลกระทบ</b>${r.impact}</p><p><b>แนวทางตอบสนอง</b>${r.action}</p><div class="incident-history">${r.history.map((h,i)=>`<span><i>${i+1}</i>${h}</span>`).join('')}</div>`;
  q('#assignIncident').disabled=r.status!=='open';q('#resolveIncident').disabled=r.status!=='assigned';
  q('#assignIncident').textContent=r.status==='open'?'รับดำเนินการ':r.status==='assigned'?'รับงานแล้ว ✓':'ปิดงานแล้ว ✓';
  q('#resolveIncident').textContent=r.status==='resolved'?'ค่ากลับสู่ปกติ ✓':'จำลองแก้ไข';
  onChange(snapshot);
 }
 root.addEventListener('click',e=>{const row=e.target.closest('[data-incident]');if(row){store.select(row.dataset.incident);render();}});
 q('#assignIncident').addEventListener('click',()=>{store.assign();render();});q('#resolveIncident').addEventListener('click',()=>{store.resolve();render();});
 q('#resetIncidents').addEventListener('click',()=>{store.reset();render();});q('#commandDetail').addEventListener('click',onDetails);
 return {render,store};
}
