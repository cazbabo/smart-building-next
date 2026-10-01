// The City Intelligence story, placed on SuperMap's 3D-CBD demo scene (Beijing
// CBD). Every position is [longitude, latitude, height in metres] and was read
// off the scene itself: tower roofs, the park lake, the interchange. Another
// scene needs its own positions, so the story only runs on the demo scene.
//
// All figures are illustrative mock data.

export const HUB = [116.452838, 39.906207, 237];      // the tallest tower's roof
export const CORE_HEIGHT = 300;                       // the data core floats above it

// The systems that already run the city, each on the place it describes.
export const SYSTEMS = [
  {id: 'gis', name: 'GIS maps', at: [116.447408, 39.910124, 5]},
  {id: 'cctv', name: 'CCTV events', at: [116.448143, 39.906205, 98]},
  {id: 'traffic', name: 'Traffic', at: [116.45574, 39.907223, 23]},
  {id: 'water', name: 'Water level', at: [116.4605, 39.9112, 5]},
  {id: 'building', name: 'Building systems', at: [116.462146, 39.905495, 161]},
  {id: 'energy', name: 'Energy meters', at: [116.469011, 39.904422, 67]},
  {id: 'service', name: 'Service records', at: [116.467864, 39.909705, 5]},
];

// Field sensors: rooftops, roads, the park and the lake shore.
export const SENSORS = [
  [116.4602, 39.9081, 5.2], [116.457444, 39.910121, 5.2], [116.462355, 39.909706, 5.2],
  [116.457, 39.9113, 5.2], [116.45574, 39.907223, 23], [116.455727, 39.914309, 5],
  [116.447408, 39.910124, 5], [116.467866, 39.9164, 5], [116.467864, 39.909705, 5.2],
  [116.468956, 39.913262, 5.2], [116.458153, 39.905643, 101], [116.464849, 39.906185, 87],
  [116.469011, 39.904422, 67], [116.461542, 39.904378, 50], [116.450518, 39.906324, 158],
  [116.462146, 39.905495, 161],
];

// The four sensors that show their reading.
export const READINGS = [
  {label: 'Water level', value: '1.20 m', at: [116.4602, 39.9081, 5.2], gauge: true},
  {label: 'Air quality', value: 'PM2.5 18', at: [116.457, 39.9113, 5.2]},
  {label: 'Energy', value: '420 kW', at: [116.458153, 39.905643, 101]},
  {label: 'Building', value: 'normal', at: [116.464849, 39.906185, 87]},
];

// The park lake's shore. The forecast area is the shore pushed out a third,
// over the paths and the road on its south side.
export const LAKE_CENTRE = [116.459818, 39.909601];
export const LAKE = [
  [116.457444, 39.910121], [116.458045, 39.910854], [116.459411, 39.911064], [116.461051, 39.911001],
  [116.462138, 39.910751], [116.462355, 39.909706], [116.462, 39.908346], [116.461046, 39.907906],
  [116.460228, 39.908032], [116.459955, 39.908869], [116.458864, 39.909183], [116.457772, 39.909282],
];
export const RISK = LAKE.map(([lon, lat]) => [
  LAKE_CENTRE[0] + (lon - LAKE_CENTRE[0]) * 1.32,
  LAKE_CENTRE[1] + (lat - LAKE_CENTRE[1]) * 1.32,
]);

// Camera per chapter: where it stands, its heading and pitch in degrees.
export const CHAPTERS = [
  {id: 'overview', tag: 'Overview', name: 'A real 3D city',
    title: 'From data to\na city in sync.',
    copy: 'One picture of the city, built from the systems that already run it. The city is a real 3D model, streamed from SuperMap iServer.',
    view: [116.45, 39.8985, 850, 20, -30]},
  {id: 'data', tag: '01 · Phase 1', name: 'Data Consolidation',
    title: 'Connect the systems\nyou already have.',
    copy: 'GIS, CCTV events, water level, building systems, energy, service records and traffic meet in one data core, each on the place it describes.',
    view: [116.444, 39.896, 1000, 35, -30]},
  {id: 'iot', tag: '02 · Phase 2', name: 'IoT Data Integration',
    title: 'See field conditions\nas they happen.',
    copy: 'Sensors on rooftops, roads and the lake shore report water, air, energy and buildings into the same picture, as they change.',
    view: [116.4625, 39.8985, 750, -20, -32]},
  {id: 'ai', tag: '03 · Phase 3', name: 'AI-Powered Intelligence',
    title: 'Anticipate. Recommend.\nPeople decide.',
    copy: 'A water-level forecast marks the area at risk around the park lake and suggests a next step. A person reviews it and decides.',
    view: [116.4598, 39.9025, 620, 0, -38]},
];
