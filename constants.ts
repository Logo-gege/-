
export const SWORD_LERP_FACTOR = 0.95; 
export const ORIENTATION_LERP_FACTOR = 0.85; 
export const CAMERA_Z = 10;
export const PLANE_DEPTH = 0; 
export const TRAIL_LENGTH = 20; 
export const TRAIL_PARTICLE_PER_STEP = 4; 
export const TRAIL_MAX_COUNT = TRAIL_LENGTH * TRAIL_PARTICLE_PER_STEP;
export const PARTICLE_COUNT = 1500; 

export const COLOR_JADE = "#2ecc71"; 
export const COLOR_BAMBOO_DEEP = "#064e3b"; 
export const COLOR_CLOUD_WHITE = "#f0fdf4"; 
export const COLOR_GOLD_THUNDER = "#f1c40f"; 
export const COLOR_MONSTER = "#ff0000"; 

export const LANDMARK_WRIST = 0;
export const LANDMARK_INDEX_FINGER_TIP = 8;
export const LANDMARK_INDEX_FINGER_MCP = 5; 

export const VIEW_WIDTH = 24; 
export const VIEW_HEIGHT = 14;

export const STABILITY_DEADZONE = 0.0001; 
export const VELOCITY_MIN_THRESHOLD = 0.0001;
export const VELOCITY_SMOOTHING = 0.6; // 提高速度响应速度

export const SWORD_ARRAY_COUNT = 180; 
export const RAIN_COUNT = 2500; 
export const SWORD_ARRAY_RADIUS = 3.5;

export const RATIO_EXTENDED = 1.2;      

export const TIME_TO_FILL_RAIN = 1800; 
export const RAIN_DURATION_S = 6.0;

export const PREDICTION_MS = 25; // 缩短预测时间，减少延迟感

// 斩妖系统配置
export const MONSTERS_TO_KILL = 8;
export const MONSTER_COLLISION_RADIUS = 2.0; 
export const MONSTER_SPAWN_INTERVAL = 1.6;
