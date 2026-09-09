export const floors = [
  {
    "id": 1,
    "name": "Lobby & Security",
    "thai": "Lobby & security",
    "occupancy": 42,
    "energy": 36,
    "room": "ROOM_LOBBY",
    "roomName": "Lobby · Security zone",
    "devices": [
      "ACCESS_G01",
      "CCTV_G01"
    ]
  },
  {
    "id": 2,
    "name": "Smart Workspace",
    "thai": "Smart workspace",
    "occupancy": 68,
    "energy": 92,
    "room": "ROOM_02_01",
    "roomName": "Meeting Room 02-01",
    "devices": [
      "SENSOR_CO2_02",
      "LIGHTING_02"
    ]
  },
  {
    "id": 3,
    "name": "Energy & Operation",
    "thai": "Energy & operations",
    "occupancy": 74,
    "energy": 182,
    "room": "ROOM_03_05",
    "roomName": "Zone A · Meeting Room 03-05",
    "devices": [
      "VAV_03",
      "SMART_METER_03"
    ]
  },
  {
    "id": 4,
    "name": "Executive & Meeting",
    "thai": "Executive offices",
    "occupancy": 56,
    "energy": 64,
    "room": "MEETING_04_01",
    "roomName": "Board Room 04-01",
    "devices": [
      "OCCUPANCY_04",
      "LIGHTING_04"
    ]
  },
  {
    "id": 5,
    "name": "Facility & Assets",
    "thai": "Facility & assets",
    "occupancy": 12,
    "energy": 51,
    "room": "FACILITY_ZONE",
    "roomName": "Facility · AHU-03 serves Floor 3",
    "devices": [
      "HVAC_AHU03",
      "PUMP_05"
    ]
  },
  {
    "id": 6,
    "name": "Solar Rooftop",
    "thai": "Solar rooftop",
    "occupancy": 0,
    "energy": 0,
    "room": "ROOFTOP",
    "roomName": "Solar generation",
    "devices": [
      "SOLAR_ARRAY",
      "SOLAR_INVERTER"
    ]
  }
];
export const devices = {
  "ACCESS_G01": {
    "name": "Door G-01",
    "type": "Smart access control",
    "floor": 1,
    "scenario": "security",
    "desc": "A controlled entrance linking access permissions with CCTV event context."
  },
  "CCTV_G01": {
    "name": "CCTV G-01",
    "type": "Security camera",
    "floor": 1,
    "scenario": "security",
    "desc": "Follow events at Door G-01 and review the connected security trace."
  },
  "SENSOR_CO2_02": {
    "name": "IAQ Sensor 02",
    "type": "Indoor air quality",
    "floor": 2,
    "scenario": "air",
    "desc": "Monitor CO₂, temperature and humidity, with ventilation responding to room occupancy."
  },
  "LIGHTING_02": {
    "name": "Lighting 02",
    "type": "Occupancy-based lighting",
    "floor": 2,
    "desc": "Adapt lighting to occupied spaces and report its status to the building platform."
  },
  "VAV_03": {
    "name": "VAV 03 · Zone A",
    "type": "HVAC distribution",
    "floor": 3,
    "scenario": "energy",
    "desc": "Distribute air from AHU-03 on Floor 5 to the office zones on Floor 3."
  },
  "SMART_METER_03": {
    "name": "Smart Meter 03",
    "type": "Energy monitoring",
    "floor": 3,
    "scenario": "energy",
    "desc": "Measure Floor 3 demand and identify the source of abnormal energy consumption."
  },
  "OCCUPANCY_04": {
    "name": "Occupancy 04",
    "type": "Presence sensor",
    "floor": 4,
    "desc": "Sense meeting room use to help maintain a comfortable environment."
  },
  "LIGHTING_04": {
    "name": "Boardroom lights",
    "type": "Smart lighting",
    "floor": 4,
    "desc": "Match executive meeting room lighting to the presence of occupants."
  },
  "HVAC_AHU03": {
    "name": "AHU-03",
    "type": "Air handling unit",
    "floor": 5,
    "scenario": "maintenance",
    "desc": "Installed on Floor 5, serving Zone A on Floor 3. Energy and asset health share one device context."
  },
  "PUMP_05": {
    "name": "Pump 05",
    "type": "Utility equipment",
    "floor": 5,
    "desc": "Monitor pump status and flow in the chilled-water circuit."
  },
  "SOLAR_ARRAY": {
    "name": "Solar Array",
    "type": "Rooftop photovoltaic",
    "floor": 6,
    "desc": "Generate clean rooftop energy and supply the building load."
  },
  "SOLAR_INVERTER": {
    "name": "Solar Inverter",
    "type": "DC to AC conversion",
    "floor": 6,
    "desc": "Convert solar DC power to AC and report generation to the building platform."
  }
};
export const scenarios = {
  "energy": {
    "title": "A smarter way to use energy",
    "en": "Energy optimization",
    "location": "Floor 3 · Zone A",
    "floor": 3,
    "device": "SMART_METER_03",
    "metric": "425 → 382 kW",
    "action": "Optimize HVAC",
    "cause": "AHU-03 supplies more air than Zone A requires, pushing Floor 3 demand 24% above its simulated baseline.",
    "prediction": "The excess load will continue through working hours if the current schedule stays unchanged.",
    "recommendation": "Align the HVAC schedule with occupancy while maintaining comfort in occupied zones.",
    "result": "HVAC Optimized · Simulated demand reduced by 43 kW",
    "trace": [
      "Mockup Building",
      "Floor 3",
      "Zone A",
      "AHU-03 · Floor 5"
    ],
    "color": "amber"
  },
  "security": {
    "title": "Protect spaces in real time",
    "en": "Access protection",
    "location": "Floor 1 · Door G-01",
    "floor": 1,
    "device": "ACCESS_G01",
    "metric": "Alert → Secure",
    "action": "Lock Door",
    "cause": "An unauthorized credential was used at Door G-01. The access event is linked to the nearby CCTV camera.",
    "prediction": "The controlled area remains exposed while the door is left unlocked.",
    "recommendation": "Lock Door G-01 and confirm the response through the access control system.",
    "result": "Door G-01 locked · Security secure",
    "trace": [
      "Mockup Building",
      "Floor 1",
      "Door G-01",
      "CCTV G-01"
    ],
    "color": "red"
  },
  "maintenance": {
    "title": "Act before equipment stops",
    "en": "Predictive maintenance",
    "location": "Floor 5 · AHU-03",
    "floor": 5,
    "device": "HVAC_AHU03",
    "metric": "62% AI health",
    "action": "Create Maintenance Task",
    "cause": "AHU-03 vibration is 3.8 mm/s, above the configured baseline for this simulated scenario.",
    "prediction": "The demo model flags a possible failure within 7 days. An on-site inspection is recommended.",
    "recommendation": "Inspect the bearing and motor, then schedule maintenance.",
    "result": "Maintenance Scheduled · DEMO-MT-001",
    "trace": [
      "Mockup Building",
      "Floor 5",
      "Facility zone",
      "AHU-03"
    ],
    "color": "amber"
  },
  "air": {
    "title": "Fresh air that follows demand",
    "en": "Indoor air quality",
    "location": "Floor 2 · Meeting 02-01",
    "floor": 2,
    "device": "SENSOR_CO2_02",
    "metric": "1,280 → 850 ppm",
    "action": "Increase Fresh Air",
    "cause": "Room occupancy has reached 92%, raising CO₂ and increasing the cooling and ventilation load.",
    "prediction": "Air quality will deteriorate if fresh-air supply does not keep pace with occupancy.",
    "recommendation": "Increase fresh air in the meeting room and monitor the CO₂ trend.",
    "result": "Fresh air increased · CO₂ 850 ppm · Good",
    "trace": [
      "Mockup Building",
      "Floor 2",
      "Meeting 02-01",
      "IAQ Sensor 02"
    ],
    "color": "amber"
  }
};
export function createStore(saved){
 let state={optimized:false,locked:false,scheduled:false,ventilated:false,securityEvent:false,airEvent:false,tick:0,feed:[],...saved};
 const listeners=new Set();
 function snapshot(){const drift=[0,1,-1,0,2,-2][state.tick%6];const air=state.airEvent&&!state.ventilated;return {...state,occupancy:68+(air?1:0)+(state.tick?drift:0),power:(state.optimized?382:425)+(air?6:0)+(state.tick?drift*3:0),solar:128+(state.tick?drift*2:0),co2:air?1280:state.ventilated?850:720+(state.tick?drift*5:0),alerts:Number(!state.optimized)+Number(!state.scheduled)+Number(state.securityEvent&&!state.locked)+Number(air),secure:!state.securityEvent||state.locked};}
 function notify(){const snap=snapshot();listeners.forEach(fn=>fn(snap));return snap;}
 function log(title){state.feed=[{title,time:new Date().toLocaleTimeString('en-GB',{hour12:false})},...state.feed].slice(0,12);}
 return {get:snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},tick(){state.tick++;return notify();},trigger(key){if(key==='security'){state.securityEvent=true;state.locked=false;log('Door G-01 · Unauthorized access detected');}if(key==='air'){state.airEvent=true;state.ventilated=false;log('Meeting 02-01 · Occupancy 92% · CO₂ rising');}return notify();},act(key){const field={energy:'optimized',security:'locked',maintenance:'scheduled',air:'ventilated'}[key];if(!field||state[field]||(key==='security'&&!state.securityEvent)||(key==='air'&&!state.airEvent))return false;state[field]=true;state.tick=0;log(scenarios[key].result);notify();return true;},reset(){state={optimized:false,locked:false,scheduled:false,ventilated:false,securityEvent:false,airEvent:false,tick:0,feed:[]};return notify();}};
};
