// Representative CSS viewports, not a claim of testing every physical device.
// Keep phone, landscape, tablet and desktop engines distinct: mobile:true
// must never be used as a stand-in for a real desktop viewport.
export const RESPONSIVE_VIEWPORTS=Object.freeze([
 {name:'smallest-supported',width:280,height:600,mobile:true,dpr:2},
 {name:'small-phone',width:320,height:568,mobile:true,dpr:2},
 {name:'android-compact',width:360,height:740,mobile:true,dpr:3},
 {name:'phone-375',width:375,height:812,mobile:true,dpr:3},
 {name:'phone-390-light',width:390,height:844,mobile:true,dpr:3,theme:'light'},
 {name:'phone-430',width:430,height:932,mobile:true,dpr:3},
 {name:'phone-480',width:480,height:854,mobile:true,dpr:2},
 {name:'phone-landscape-568',width:568,height:320,mobile:true,dpr:2,shortLandscape:true},
 {name:'phone-landscape-667',width:667,height:375,mobile:true,dpr:2,shortLandscape:true},
 {name:'phone-landscape-844',width:844,height:390,mobile:true,dpr:3,shortLandscape:true},
 {name:'phone-landscape-926',width:926,height:428,mobile:true,dpr:3,shortLandscape:true},
 {name:'small-tablet',width:600,height:960,mobile:true,dpr:2},
 {name:'tablet-portrait',width:768,height:1024,mobile:true,dpr:2},
 {name:'tablet-wide-portrait',width:820,height:1180,mobile:true,dpr:2},
 {name:'tablet-landscape',width:1024,height:768,mobile:true,dpr:2},
 {name:'laptop',width:1280,height:800,mobile:false,dpr:1},
 {name:'desktop-light-reduced-motion',width:1440,height:900,mobile:false,dpr:1,theme:'light',reducedMotion:true},
 {name:'large-desktop',width:1920,height:1080,mobile:false,dpr:1}
].map(profile=>Object.freeze(profile)));
