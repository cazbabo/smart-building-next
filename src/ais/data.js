export const floors=[
 {id:1,name:'Lobby & Security',thai:'ล็อบบี้และความปลอดภัย',occupancy:42,energy:36,room:'ROOM_LOBBY',roomName:'Lobby · Security zone',devices:['ACCESS_G01','CCTV_G01']},
 {id:2,name:'Smart Workspace',thai:'พื้นที่ทำงานอัจฉริยะ',occupancy:68,energy:92,room:'ROOM_02_01',roomName:'Meeting Room 02-01',devices:['SENSOR_CO2_02','LIGHTING_02']},
 {id:3,name:'Energy & Operation',thai:'พลังงานและการทำงาน',occupancy:74,energy:182,room:'ROOM_03_05',roomName:'Zone A · Meeting Room 03-05',devices:['VAV_03','SMART_METER_03']},
 {id:4,name:'Executive & Meeting',thai:'พื้นที่ผู้บริหาร',occupancy:56,energy:64,room:'MEETING_04_01',roomName:'Board Room 04-01',devices:['OCCUPANCY_04','LIGHTING_04']},
 {id:5,name:'Facility & Assets',thai:'ระบบอาคารและเครื่องจักร',occupancy:12,energy:51,room:'FACILITY_ZONE',roomName:'Facility · AHU-03 serves Floor 3',devices:['HVAC_AHU03','PUMP_05']},
 {id:6,name:'Solar Rooftop',thai:'พลังงานสะอาดบนดาดฟ้า',occupancy:0,energy:0,room:'ROOFTOP',roomName:'Solar generation',devices:['SOLAR_ARRAY','SOLAR_INVERTER']}
];
export const devices={
 ACCESS_G01:{name:'Door G-01',type:'Smart access control',floor:1,scenario:'security',desc:'ประตูเขตควบคุม เชื่อมสิทธิ์เข้าออกกับกล้อง CCTV'},
 CCTV_G01:{name:'CCTV G-01',type:'Security camera',floor:1,scenario:'security',desc:'ติดตามเหตุการณ์จากประตู G-01 และแสดงเส้นทางตรวจสอบ'},
 SENSOR_CO2_02:{name:'IAQ Sensor 02',type:'Indoor air quality',floor:2,scenario:'air',desc:'ตรวจ CO₂ อุณหภูมิและความชื้น เชื่อมจำนวนคนกับการระบายอากาศ'},
 LIGHTING_02:{name:'Lighting 02',type:'Occupancy-based lighting',floor:2,desc:'ปรับแสงตามการใช้พื้นที่ และส่งสถานะเข้าแพลตฟอร์ม'},
 VAV_03:{name:'VAV 03 · Zone A',type:'HVAC distribution',floor:3,scenario:'energy',desc:'จ่ายอากาศจาก AHU-03 บนชั้น 5 ให้พื้นที่สำนักงานชั้น 3'},
 SMART_METER_03:{name:'Smart Meter 03',type:'Energy monitoring',floor:3,scenario:'energy',desc:'ตรวจโหลดชั้น 3 และแยกสาเหตุการใช้พลังงานผิดปกติ'},
 OCCUPANCY_04:{name:'Occupancy 04',type:'Presence sensor',floor:4,desc:'ตรวจการใช้ห้องประชุมเพื่อจัดสภาพแวดล้อมให้เหมาะสม'},
 LIGHTING_04:{name:'Boardroom lights',type:'Smart lighting',floor:4,desc:'แสงห้องประชุมผู้บริหารสัมพันธ์กับจำนวนผู้ใช้งาน'},
 HVAC_AHU03:{name:'AHU-03',type:'Air handling unit',floor:5,scenario:'maintenance',desc:'ติดตั้งที่ชั้น 5 ให้บริการ Zone A ชั้น 3 เชื่อมข้อมูลพลังงานและสุขภาพเครื่อง'},
 PUMP_05:{name:'Pump 05',type:'Utility equipment',floor:5,desc:'ตรวจสถานะปั๊มและการไหลในวงจรน้ำเย็น'},
 SOLAR_ARRAY:{name:'Solar Array',type:'Rooftop photovoltaic',floor:6,desc:'ผลิตพลังงานสะอาดบนหลังคาแล้วจ่ายให้โหลดอาคาร'},
 SOLAR_INVERTER:{name:'Solar Inverter',type:'DC to AC conversion',floor:6,desc:'แปลงไฟจากแผง Solar และส่งข้อมูลการผลิตเข้าแพลตฟอร์ม'}
};
export const scenarios={
 energy:{title:'ใช้พลังงานได้คุ้มค่ากว่านี้',en:'Energy optimization',location:'Floor 3 · Zone A',floor:3,device:'SMART_METER_03',metric:'425 → 382 kW',action:'Optimize HVAC',cause:'AHU-03 จ่ายอากาศเกินความต้องการของ Zone A ทำให้โหลดชั้น 3 สูงกว่าค่าปกติ 24%',prediction:'หากคงตารางเดิม โหลดส่วนเกินจะต่อเนื่องตลอดช่วงทำงาน',recommendation:'ปรับตาราง HVAC ให้สัมพันธ์กับจำนวนคน โดยรักษาความสบายในพื้นที่',result:'HVAC Optimized · ลดโหลดจำลอง 43 kW',trace:['Mockup Building','Floor 3','Zone A','AHU-03 · Floor 5'],color:'amber'},
 security:{title:'ปกป้องพื้นที่ได้ทันเหตุการณ์',en:'Access protection',location:'Floor 1 · Door G-01',floor:1,device:'ACCESS_G01',metric:'Alert → Secure',action:'Lock Door',cause:'ตรวจพบการพยายามเข้าประตู G-01 ด้วยสิทธิ์ที่ไม่ได้รับอนุญาต กล้อง CCTV เชื่อมกับเหตุเดียวกัน',prediction:'พื้นที่ควบคุมยังมีความเสี่ยงหากประตูเปิดค้าง',recommendation:'ล็อกประตู G-01 และยืนยันสถานะจากระบบ Access Control',result:'Door G-01 locked · Security secure',trace:['Mockup Building','Floor 1','Door G-01','CCTV G-01'],color:'red'},
 maintenance:{title:'ดูแลเครื่องจักรก่อนหยุดทำงาน',en:'Predictive maintenance',location:'Floor 5 · AHU-03',floor:5,device:'HVAC_AHU03',metric:'62% AI health',action:'Create Maintenance Task',cause:'AHU-03 มีการสั่น 3.8 mm/s สูงกว่าค่าฐานที่ตั้งไว้ในสถานการณ์จำลอง',prediction:'แบบจำลองคาดการณ์ความเสี่ยงภายใน 7 วัน จึงควรตรวจยืนยันหน้างาน',recommendation:'ตรวจ bearing และ motor แล้วนัดหมายงานซ่อมบำรุง',result:'Maintenance Scheduled · DEMO-MT-001',trace:['Mockup Building','Floor 5','Facility zone','AHU-03'],color:'amber'},
 air:{title:'อากาศที่ปรับตามผู้ใช้งาน',en:'Indoor air quality',location:'Floor 2 · Meeting 02-01',floor:2,device:'SENSOR_CO2_02',metric:'1,280 → 850 ppm',action:'Increase Fresh Air',cause:'จำนวนคนในห้องเพิ่มเป็น 92% ทำให้ CO₂ สูงขึ้นและเพิ่มภาระระบบปรับอากาศ',prediction:'คุณภาพอากาศจะลดลงหากอัตราเติมอากาศไม่สัมพันธ์กับผู้ใช้งาน',recommendation:'เพิ่มอากาศใหม่ให้ห้องประชุม แล้วติดตามแนวโน้ม CO₂',result:'Fresh air increased · CO₂ 850 ppm · Good',trace:['Mockup Building','Floor 2','Meeting 02-01','IAQ Sensor 02'],color:'amber'}
};
export function createStore(saved){
 let state={optimized:false,locked:false,scheduled:false,ventilated:false,securityEvent:false,airEvent:false,tick:0,feed:[],...saved};
 const listeners=new Set();
 function snapshot(){const drift=[0,1,-1,0,2,-2][state.tick%6];const air=state.airEvent&&!state.ventilated;return {...state,occupancy:68+(air?1:0)+(state.tick?drift:0),power:(state.optimized?382:425)+(air?6:0)+(state.tick?drift*3:0),solar:128+(state.tick?drift*2:0),co2:air?1280:state.ventilated?850:720+(state.tick?drift*5:0),alerts:Number(!state.optimized)+Number(!state.scheduled)+Number(state.securityEvent&&!state.locked)+Number(air),secure:!state.securityEvent||state.locked};}
 function notify(){const snap=snapshot();listeners.forEach(fn=>fn(snap));return snap;}
 function log(title){state.feed=[{title,time:new Date().toLocaleTimeString('th-TH',{hour12:false})},...state.feed].slice(0,12);}
 return {get:snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},tick(){state.tick++;return notify();},trigger(key){if(key==='security'){state.securityEvent=true;state.locked=false;log('Door G-01 · Unauthorized access detected');}if(key==='air'){state.airEvent=true;state.ventilated=false;log('Meeting 02-01 · Occupancy 92% · CO₂ rising');}return notify();},act(key){const field={energy:'optimized',security:'locked',maintenance:'scheduled',air:'ventilated'}[key];if(!field||state[field]||(key==='security'&&!state.securityEvent)||(key==='air'&&!state.airEvent))return false;state[field]=true;state.tick=0;log(scenarios[key].result);notify();return true;},reset(){state={optimized:false,locked:false,scheduled:false,ventilated:false,securityEvent:false,airEvent:false,tick:0,feed:[]};return notify();}};
}
