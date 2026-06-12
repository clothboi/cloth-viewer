// TextylSpheresCloth: replaces the procedural spheres with rendered cloth loops.
// Same wrappers + scroll parallax as spheres.js. Each video carries two sources:
// VP9 alpha WebM (Chrome/Edge/Firefox/Android) and H.264 MP4 composited on the
// page teal (Safari/iOS). When the browser can't do alpha video, the matrix rain
// is lifted above the videos so their flat background sits invisibly on the body.
(function(){
  function I(){
    if(window.txCloth)return;window.txCloth=1;
    var d=document;
    var BASE='https://clothboi.github.io/cloth-viewer/';
    var DESK=[
      {l:'72%',t:'18%',sz:760,b:0,v:'cloth-near',dp:0.06},
      {l:'30%',t:'58%',sz:480,b:2,v:'cloth-mid',dp:0.045},
      {l:'58%',t:'82%',sz:340,b:4,v:'cloth-far',dp:0.03}
    ];
    var MOB=[
      {l:'100%',t:'12%',sz:600,b:0,v:'cloth-near',dp:0.06},
      {l:'0%',  t:'56%',sz:480,b:2,v:'cloth-mid',dp:0.045},
      {l:'96%', t:'82%',sz:300,b:4,v:'cloth-far',dp:0.03}
    ];
    var probe=d.createElement('video');
    var hasAlpha=!!probe.canPlayType&&probe.canPlayType('video/webm; codecs="vp9"')!=='';
    if(!hasAlpha){
      var rain=d.getElementById('tx-mx-bg');
      if(rain)rain.style.zIndex='8';           // rain drifts over the cloths instead
    }
    var box=d.createElement('div');
    box.id='tx-cloth';
    box.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:7;overflow:hidden';
    d.body.appendChild(box);

    var nodes=[],scrollY=0,ticking=false,current=null;
    function apply(){
      for(var i=0;i<nodes.length;i++){
        var off=-scrollY*nodes[i].dp;
        if(off<-70)off=-70; else if(off>70)off=70;
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
        var v=d.createElement('video');
        v.autoplay=true;v.loop=true;v.muted=true;v.playsInline=true;
        v.setAttribute('muted','');v.setAttribute('playsinline','');
        v.preload='auto';
        v.style.cssText='width:100%;height:100%;display:block';
        var s1=d.createElement('source');s1.src=BASE+s.v+'.webm';s1.type='video/webm';
        var s2=d.createElement('source');s2.src=BASE+s.v+'.mp4';s2.type='video/mp4';
        v.appendChild(s1);v.appendChild(s2);
        w.appendChild(v);box.appendChild(w);
        v.play&&v.play().catch(function(){});
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
