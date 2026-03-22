import { CONFIG } from '../config.js';

function drawArt(ctx, ox, oy, rows, pal, scale=2) {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const c = row[rx];
      if (c === "_" || c === " ") continue;
      const col = pal[c]; if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + rx*scale, oy + ry*scale, scale, scale);
    }
  });
}

function makeArtTex(scene, key, rows, pal, scale=2) {
  const w = rows[0].length * scale, h = rows.length * scale;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  drawArt(cv.getContext("2d"), 0, 0, rows, pal, scale);
  scene.textures.addCanvas(key, cv);
}

export class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }

  preload() {
    const {width:W, height:H} = this.cameras.main;
    this.add.text(W/2, H/2-22, "AETHORIA", {fontFamily:"Courier New", fontSize:"36px", color:"#d4af37"}).setOrigin(0.5);
    this.add.text(W/2, H/2+16, "Generating world...", {fontFamily:"Courier New", fontSize:"14px", color:"#555555"}).setOrigin(0.5);
  }

  create() {
    this._makeTileset();
    this._makePlayer();
    this._makeEnemies();
    this._makeBosses();
    this._makeNPCs();
    this._makeLoot();
    this._makeParticle();
    this.scene.start("MenuScene");
  }

  _tile(c, ox, rows, pal) { drawArt(c, ox, 0, rows, pal, 2); }

  _makeTileset() {
    const cv = document.createElement("canvas");
    cv.width=320; cv.height=32;
    const c = cv.getContext("2d");
    const T = [
      // 1 deep water
      [{D:"#0d1e30",M:"#0f2e4a",L:"#1a4a6e",F:"#2060a0"}, [
        "DDDMMMDDDDMMMDDM","DMLLLMDDMLLLLDMD","MLLFFLLMLLFFLLMD","LLFFFFFFLFFFFFFFF",
        "FFFFFFFFLFFFFFFLF","LFFFFFLLLFFFLLL D","DDLLLLDDDDLLLDDDD","DDDMMMDDDDMMMDDM",
        "MMMDDDMMMMDDDMMMM","MLLLLMMMLLLLLMMD","LLFFLMLLLFFLLLMD","LFFFFFFLFFFFFFFFFF",
        "FFFFFFFFFFFFLFFF","LFFFLLLLFFLLLLL D","DDLLMDDDDLLMDDDDD","DDDMMMDDDDMMMDDM"
      ]],
      // 2 water
      [{B:"#1a4a80",M:"#2464a8",L:"#3888cc",F:"#88c8e8",W:"#c8ecf8"}, [
        "BBBBBBBBBBBBBBBB","BMMMBBBBMMMMBBBBB","BMLMBBBBMMLLMMBBB","BMMMMBBBBMMMMMMBB",
        "BBBBBBBBBBBBBBBBB","BBBMMMMBBBBMMMMMB","BBBMLLLMBBBMLLLM","BBBMMMMBBBBMMMMBB",
        "BBBBBBBBBBBBBBBBB","BMMMBBBBBBMMBBBMB","BMLFWBBBBBMLFW B","BMMMBBBBBBMMMBBMB",
        "BBBBBBBBBBBBBBBBB","BBBBBMMMMBBBBMMMM","BBBBBMLLLMBBBMLLL","BBBBBMMMMBBBBMMMM"
      ]],
      // 3 sand
      [{B:"#c8a040",M:"#b08830",L:"#d8bc58",H:"#e8d070",P:"#786018"}, [
        "BBMMBLLBBBMMBLBB","MMHHLLLBBMMHHLLBB","BBBMMLLBBBBBMLLBB","LBBBBBMMLLBBBBMMM",
        "BBLLBBMMBBLLBBMMM","MMBBLLBBMMBBLLBBB","BPBBBBLLBBPBBBLLL","BBBBMMBBBBBBMMBBB",
        "LLMMBBLLLLMMBBLL","BBBBLLMMBBBBLLMMM","MMBBBBBBMMBBBBBB","BBLLMMBBBBLLMMBB",
        "BBBBBPBBMMBBPBBB","LLBBBBLLBBLLBBMMM","MMBBLLBBMMBBLLBBB","BBMMBBLLBBMMBBLL"
      ]],
      // 4 grass
      [{G:"#2d6a2a",M:"#1e5018",L:"#3d8a38",H:"#52aa44"}, [
        "GGGGGGGGGGGGGGGG","GGLGGGGMGGGLGGGM","GGGGGGGGGGGGGGGG","GLGGGMGGGLGGGMGG",
        "GGHHGGGGGGHHGGGG","GGGGGGGGGGGGGGGG","GGGGMGGGGGGGMGGG","GGGGGGGLGGGGGGGGL",
        "GGLGGGGGGGGLGGGG","GGGGGGGGGGGGGGGG","GGMGGGHHGGGMGGGG","GGGGGGGGGGGGGGGG",
        "GLGGGGMGGGLGGGGM","GGGGGGGGGGGGGGGG","GGHHGGGGGGMGGGGG","GGGGGLGGGGGGGGGG"
      ]],
      // 5 forest
      [{G:"#1a4a1a",D:"#0f3010",M:"#256625",L:"#348034",H:"#44aa40",T:"#4a2808",t:"#3a1c04"}, [
        "DDDGDDDGGGDGDDGD","DGDMGDGMGDMGDMGD","GDMMGMGDMMGMGDMM","GMMHHMMMHHMMMMHM",
        "DMMHHHMMMHHHMMMH","MMHHHHHMMHHHHHHM","MHHHHHHHHHHHHHH M","HHHHHHHHHHHHHHHH",
        "HHTTHHHHHHTTHHH H","GTTTGGGGTTTtGGGG","GGTTtGGGGTTGGGGG","GGGTGGGGGGTGGGtG",
        "GGGDGGGDGGGGGDGG","GDMGGDGGDMGGGDGG","GDMGGGGDGMGGGGGD","GGDGGGGGGGDGGGGG"
      ]],
      // 6 stone wall
      [{K:"#282828",L:"#808080",M:"#686868",B:"#505050"}, [
        "KKKKKKKKKKKKKKKK","KLLLLLLKKLLLLLKK","KLLLLLLKKLLLLLKK","KLLLLLLKKLLLLLKK",
        "KKKKKKKKKKKKKKKK","KKKLLLLLLKKKLLLL","KKKLLMMLLKKKLLMK","KKKLLLLLLKKKLLLL",
        "KKKKKKKKKKKKKKKK","KLLLLLLKKLLLLLKK","KLLBMLLLKKLBLLKK","KLLLLLLKKLLLLLKK",
        "KKKKKKKKKKKKKKKK","KLLLLKKKLLLLKKLK","KLLLLKKKLLLLKKLK","KKKKKKKKKKKKKKKK"
      ]],
      // 7 dungeon floor
      [{B:"#2a3540",D:"#1e2730",K:"#141c22"}, [
        "KKKKKKKKKKKKKKKK","KBBBBBBBBBBBBBBK","KBBLBBBLBBLBBBLK","KBBBBBBBBBBBBBBK",
        "KBBBBBBBBBBBBBBK","KBBBBBBBBBBBBBBK","KBBBKBBBBBBKBBBK","KBBBBBBBBBBBBBBK",
        "KBBBBBBBBBBBBBBK","KBLBBBLBBLBBBLBK","KBBBBBBBBBBBBBBK","KBBBBBBBBBBBBBBK",
        "KBBBBBBBBBBBBBBK","KBBKBBBBBBKBBBBK","KBBBBBBBBBBBBBBK","KKKKKKKKKKKKKKKK"
      ]],
      // 8 dungeon wall
      [{K:"#0d0d0d",D:"#181818",M:"#222222",L:"#2e2e2e"}, [
        "DDDDDDDDDDDDDDDD","DLLLLLLKKLLLLLLD","DLMMMMLKKMMMMMLD","DLLLLLLKKLLLLLLD",
        "KKKKKKKKKKKKKKKK","DLLLLKKKKLLLLLLD","DLMMKKKKMMMMMLLD","DLLLLKKKKLLLLLLD",
        "KKKKKKKKKKKKKKKK","DLLLLLLKKLLLLLLD","DLMMMMLKKLMMMMLD","DLLLLLLKKLLLLLLD",
        "KKKKKKKKKKKKKKKK","DLLLLKKKLLLLKKLD","DLLMMKKKMMMMKKLD","KKKKKKKKKKKKKKKK"
      ]],
      // 9 dirt path
      [{B:"#8a6a3a",D:"#6a5028",L:"#a07848",P:"#503818",H:"#b08858"}, [
        "BBBBDDBBBBDDBBBB","BBLBBBBDBBBBDBBB","BBBBBPLBBBBBPLBB","DBBBBBBBDBBBBBBB",
        "BBHBBBBBBBHBBBBB","BBBBBBBPBBBBBBPB","DBBBBBBBBDBBBBBB","BBBBDDBBBBDDBBBB",
        "BBLBBBBBBLBBBBBB","BBBBPLBBBBBBPLBB","DBBBBBBBDBBBBBBB","BBHBBBBBBBBHBBBB",
        "BBBBBPBBBBBBBPBB","DBBBBBBBBDBBBBBB","BBBBDDBBBBDDBBBB","BBBBBBBBBBBBBBBB"
      ]],
      // 10 town cobblestone
      [{K:"#505048",H:"#c8c8b8",L:"#909080"}, [
        "KKKKKKKKKKKKKKKK","KHHHHHHKKHHHHHKK","KHLLLHHKKHLLHKKK","KHHHHHHKKHHHHHKK",
        "KKKKKKKKKKKKKKKK","KKKKHHHHHKKKHHHK","KKKKHLLHHKKKHLHK","KKKKHHHHHKKKHHHK",
        "KKKKKKKKKKKKKKKK","KHHHHHHKKHHHHHKK","KHLLLHHKKHLLHKKK","KHHHHHHKKHHHHHKK",
        "KKKKKKKKKKKKKKKK","KKKKHHHHHKKKHHHK","KKKKHLLHHKKKHLHK","KKKKKKKKKKKKKKKK"
      ]],
    ];
    T.forEach(([pal, rows], i) => this._tile(c, i*32, rows.map(r=>r.replace(/ /g,"").slice(0,16)), pal));
    this.textures.addCanvas("tileset", cv);
  }

  _makePlayer() {
    const rows = [
      "____KKKKKK______",
      "___KhHHHHhK_____",
      "__KhHHHHHHhK____",
      "__KKSSssSSKK____",
      "__KSWsKKssSK____",
      "__KSSssssSSK____",
      "__KKSSssSSKK____",
      "_KKBAAAbbBKK____",
      "_KBAAAAAbbBK____",
      "_KBAAAAAbbBK____",
      "_KKBAAAbbBKK____",
      "__KBBbbbBBK_____",
      "__KLLllLLK______",
      "__KLLllLLK______",
      "__KTKkkKTK______",
      "___KKKKKK_______",
    ];
    const cp = {WARRIOR:{B:"#2244aa",b:"#112266",A:"#7799cc",H:"#5a3010",h:"#3a1800"},
                MAGE:   {B:"#553388",b:"#331166",A:"#9977cc",H:"#ddaa22",h:"#bb8800"},
                RANGER: {B:"#2a5c2a",b:"#183a18",A:"#66aa44",H:"#882200",h:"#550000"}};
    const base = {K:"#111111",S:"#f0c090",W:"#ffffff",s:"#cc9860",L:"#334455",l:"#223344",k:"#111111",T:"#222222"};
    Object.entries(cp).forEach(([cls,p]) => makeArtTex(this,"player_"+cls,rows,{...base,...p},2));
    makeArtTex(this,"player",rows,{...base,...cp.WARRIOR},2);
  }

  _makeEnemies() {
    // Goblin 20x20 at 2x
    makeArtTex(this,"enemy_GOBLIN",[
      "__KKKKKK__","_KGGggGGK_","_KGGGGGgK_","_KGKeeKGK_",
      "_KGKoKGGK_","_KKGGGggK_","__KbbbbK__","__KbKbK___","__KbKbK___","___KKK____"
    ],{K:"#111111",G:"#44aa33",g:"#55cc44",b:"#336622",e:"#ffcc00",o:"#dd4400"},2);
    // Wolf 28x20 at 2x
    makeArtTex(this,"enemy_WOLF",[
      "_KKKK_KKKKK___","KggggKgggggK__","KgSSgKgeeggK_","KggggKgKoKgK_",
      "KKgggKKKKggKK","_KggggggggK__","_KggttttggK__","KKgtttttgKK_",
      "KtKKgggKKtK__","KKK_KKK_KKK_"
    ],{K:"#111111",g:"#888888",S:"#aaaaaa",t:"#444444",e:"#ffdd00",o:"#cc2222"},2);
    // Skeleton 20x24 at 2x
    makeArtTex(this,"enemy_SKELETON",[
      "__KKKKKK__","_KwwwwwwK_","_KwEwwEwK_","_KwwKwKwK_",
      "_KKwwwwKK_","___KwwK___","__KKwwKK__","_KwwwwwwK_",
      "_KwwKKwwK_","_KKwwwwKK_","___KwKwK__","___KKKKKK_"
    ],{K:"#111111",w:"#d8d8c0",E:"#cc0000"},2);
    // Troll 28x28 at 2x
    makeArtTex(this,"enemy_TROLL",[
      "__KKKKKKKKKK__","_KbbSbbbbSbbK_","_KbbbbbbbbbbbK","_KbSbbKKbbSbK_",
      "_KbbbbbbbbbbbK","_KKbbbbbbbbbKK","KKKbbbbbbbKKK_","KbbKbbbbbKbbK_",
      "KbbbbbbbbbbbbK","KbbbbbbbbbbbbK","_KKbbbbbbbKK__","__KKlllllKK___",
      "__KlllllllK___","___KtKKKtK____"
    ],{K:"#111111",b:"#7a5a2a",S:"#b8904a",l:"#5a3a18",t:"#222222"},2);
  }

  _makeBosses() {
    // Void Knight 48x48
    const vk = document.createElement("canvas");
    vk.width=48; vk.height=48;
    const vc=vk.getContext("2d"), vr=(x,y,w,h,col)=>{vc.fillStyle=col;vc.fillRect(x,y,w,h);};
    vr(0,0,48,48,"#1a0030"); vr(2,2,44,44,"#280044");
    vr(14,4,20,4,"#111111"); vr(12,8,24,6,"#220044"); vr(10,14,28,4,"#111111");
    vr(14,11,6,4,"#cc00ff"); vr(28,11,6,4,"#cc00ff"); vr(15,12,4,2,"#ff44ff"); vr(29,12,4,2,"#ff44ff");
    vr(10,18,28,14,"#1a0033"); vr(8,20,32,10,"#330055");
    vr(16,22,4,2,"#8800cc"); vr(28,22,4,2,"#8800cc"); vr(22,20,4,4,"#aa00ff");
    vr(4,18,8,8,"#220044"); vr(36,18,8,8,"#220044");
    vr(8,32,32,14,"#1a0022"); vr(14,32,8,12,"#220033"); vr(26,32,8,12,"#220033");
    vr(12,44,10,4,"#111111"); vr(26,44,10,4,"#111111");
    vc.strokeStyle="#6600aa"; vc.lineWidth=1.5; vc.strokeRect(1,1,46,46);
    this.textures.addCanvas("boss_VOID_KNIGHT",vk);

    // Stone Colossus 56x56
    const sc=document.createElement("canvas");
    sc.width=56; sc.height=56;
    const cc=sc.getContext("2d"), cr=(x,y,w,h,col)=>{cc.fillStyle=col;cc.fillRect(x,y,w,h);};
    cr(0,0,56,56,"#2a1e10"); cr(2,2,52,52,"#3a2a18");
    cr(8,8,40,46,"#4a3a24"); cr(10,10,36,42,"#5a4a30");
    cc.fillStyle="#2a1e10";
    [0,1,2,3,4,5,6].forEach(i=>cc.fillRect(12+i*5,14+((i*7)%24),2,4+(i%4)*2));
    cr(14,16,10,8,"#dd4400"); cr(32,16,10,8,"#dd4400");
    cr(16,18,6,4,"#ff8800"); cr(34,18,6,4,"#ff8800");
    cr(18,32,20,2,"#111111");
    cc.fillStyle="#7a6040"; [0,1,2,3].forEach(i=>cc.fillRect(12+i*9,28,5,2));
    cc.strokeStyle="#9a7030"; cc.lineWidth=2; cc.strokeRect(1,1,54,54);
    this.textures.addCanvas("boss_STONE_COLOSSUS",sc);
  }

  _makeNPCs() {
    const cfgs=[
      {robe:"#ccaa22",trim:"#ffe060",hat:"#8a6a10"},
      {robe:"#884422",trim:"#cc6633",hat:"#552211"},
      {robe:"#2a6622",trim:"#55aa33",hat:"#1a4414"},
      {robe:"#2244aa",trim:"#5577dd",hat:"#112266"},
      {robe:"#226688",trim:"#4499bb",hat:"#113344"},
    ];
    const skins=["#f0c090","#e0a870","#d49060","#f5d0a8","#c88050"];
    cfgs.forEach((cfg,i)=>{
      const cv=document.createElement("canvas"); cv.width=32; cv.height=32;
      const c=cv.getContext("2d"), r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
      const K="#111111",S=skins[i];
      r(10,2,12,5,K); r(11,3,10,3,cfg.hat);
      r(9,6,14,12,K); r(10,7,12,10,S);
      r(12,9,2,2,"#222222"); r(18,9,2,2,"#222222");
      r(13,14,6,1,"#cc7755");
      r(7,17,18,13,K); r(8,18,16,11,cfg.robe); r(8,24,16,2,cfg.trim);
      r(5,17,4,11,K); r(6,18,3,9,cfg.robe);
      r(23,17,4,11,K); r(24,18,3,9,cfg.robe);
      r(6,26,3,3,S); r(23,26,3,3,S);
      r(10,29,5,3,K); r(17,29,5,3,K);
      r(11,29,4,2,"#333333"); r(18,29,4,2,"#333333");
      this.textures.addCanvas("npc_"+i,cv);
    });
  }

  _makeLoot() {
    const cv=document.createElement("canvas"); cv.width=20; cv.height=20;
    const c=cv.getContext("2d"), r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
    r(4,2,12,16,"#111111"); r(5,3,10,14,"#c8a000"); r(6,4,8,12,"#f0c800");
    r(7,5,6,4,"#fff088"); r(9,10,2,4,"#a07800");
    this.textures.addCanvas("loot",cv);
  }

  _makeParticle() {
    const g=this.make.graphics({add:false});
    g.fillStyle(0xffffff); g.fillCircle(4,4,4);
    g.generateTexture("particle",8,8); g.destroy();
  }
}
