(function(){
  function I(){
    if(window.txSpheres)return;window.txSpheres=1;
    var d=document;
    // desktop positions
    var DESK=[
      {l:'72%',t:'18%',sz:380,b:0,c:'#5CDDC6',dp:0.06},
      {l:'30%',t:'58%',sz:240,b:3,c:'#C0B3FA',dp:0.045},
      {l:'58%',t:'82%',sz:170,b:7,c:'#295c66',dp:0.03}
    ];
    // mobile / tablet (<=991): spheres sit half off-screen, navy slightly off right
    var MOB=[
      {l:'100%',t:'12%',sz:300,b:0,c:'#5CDDC6',dp:0.06}, // cyan: half off the right
      {l:'0%',  t:'56%',sz:240,b:3,c:'#C0B3FA',dp:0.045}, // lilac: half off the left
      {l:'96%', t:'82%',sz:150,b:7,c:'#295c66',dp:0.03}  // navy: slightly off the right
    ];
    function shade(hex,amt){
      var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
      r=Math.max(0,Math.min(255,Math.round(r+(amt>0?(255-r):r)*amt)));
      g=Math.max(0,Math.min(255,Math.round(g+(amt>0?(255-g):g)*amt)));
      b=Math.max(0,Math.min(255,Math.round(b+(amt>0?(255-b):b)*amt)));
      return 'rgb('+r+','+g+','+b+')';
    }
    var box=d.createElement('div');
    box.id='tx-spheres';
    box.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:7;overflow:hidden';
    d.body.appendChild(box);

    var nodes=[],scrollY=0,ticking=false,current=null;
    function apply(){
      for(var i=0;i<nodes.length;i++){
        var off=-scrollY*nodes[i].dp;
        if(off<-70)off=-70; else if(off>70)off=70;   // clamp: stay on the page
        nodes[i].w.style.transform='translate(-50%, calc(-50% + '+off+'px))';
      }
      ticking=false;
    }
    function build(){
      var mode=(window.innerWidth<=991)?'m':'d';
      if(mode===current)return;
      current=mode;
      box.innerHTML='';nodes=[];
      (mode==='m'?MOB:DESK).forEach(function(s){
        var w=d.createElement('div');
        w.style.cssText='position:absolute;left:'+s.l+';top:'+s.t+';width:'+s.sz+'px;height:'+s.sz+'px;transform:translate(-50%,-50%);will-change:transform;filter:blur('+s.b+'px);transition:transform 0.12s ease-out';
        var orb=d.createElement('div');
        orb.style.cssText='width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 30% 28%, '+shade(s.c,0.55)+' 0%, '+s.c+' 45%, '+shade(s.c,-0.55)+' 100%);box-shadow:inset -20px -30px 60px rgba(0,0,0,0.35), 0 30px 80px rgba(0,0,0,0.4)';
        w.appendChild(orb);box.appendChild(w);
        nodes.push({w:w,dp:s.dp});
      });
      apply();
    }
    addEventListener('scroll',function(){scrollY=window.scrollY;if(!ticking){requestAnimationFrame(apply);ticking=true;}},{passive:true});
    var RT;addEventListener('resize',function(){clearTimeout(RT);RT=setTimeout(build,200);},{passive:true});
    build();
  }
  if(document.body)I();else addEventListener('DOMContentLoaded',I);
})();
