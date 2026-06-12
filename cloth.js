// TextylSpheresCloth v3
// - cloths are anchored to the page (no parallax, they scroll with content)
// - poster PNG shows instantly and remains if video can't play (iOS Low Power)
// - browsers with VP9-alpha get a plain transparent <video>
// - Safari/iOS gets a stacked-alpha video (colour|matte side by side)
//   recombined to true transparency in a small WebGL canvas
(function(){
  function I(){
    if(window.txCloth)return;window.txCloth=1;
    var d=document;
    var BASE='https://clothboi.github.io/cloth-viewer/';
    var DESK=[
      {l:'72%',t:'18%',sz:760,b:0,v:'cloth-near'},
      {l:'30%',t:'58%',sz:480,b:2,v:'cloth-mid'},
      {l:'58%',t:'82%',sz:340,b:4,v:'cloth-far'}
    ];
    var MOB=[
      {l:'100%',t:'12%',sz:600,b:0,v:'cloth-near'},
      {l:'0%',  t:'56%',sz:480,b:2,v:'cloth-mid'},
      {l:'96%', t:'82%',sz:300,b:4,v:'cloth-far'}
    ];
    var probe=d.createElement('video');
    var hasAlpha=!!probe.canPlayType&&probe.canPlayType('video/webm; codecs="vp9"')!=='';

    var box=d.createElement('div');
    box.id='tx-cloth';
    box.style.cssText='position:absolute;top:0;left:0;width:100%;height:100vh;pointer-events:none;z-index:7;overflow:hidden';
    d.body.appendChild(box);

    function makeVideo(src,poster){
      var v=d.createElement('video');
      v.autoplay=true;v.loop=true;v.muted=true;v.playsInline=true;
      v.setAttribute('muted','');v.setAttribute('playsinline','');
      v.preload='auto';v.crossOrigin='anonymous';
      if(poster)v.poster=poster;
      v.src=src;
      return v;
    }

    function glCompositor(canvas,video){
      var gl=canvas.getContext('webgl',{premultipliedAlpha:true,alpha:true});
      if(!gl)return null;
      function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o;}
      var p=gl.createProgram();
      gl.attachShader(p,sh(gl.VERTEX_SHADER,'attribute vec2 a;varying vec2 v;void main(){v=a*0.5+0.5;gl_Position=vec4(a,0.,1.);}'));
      gl.attachShader(p,sh(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 v;uniform sampler2D u;void main(){vec2 q=vec2(v.x*0.5,1.0-v.y);vec3 c=texture2D(u,q).rgb;float a=texture2D(u,vec2(q.x+0.5,q.y)).r;gl_FragColor=vec4(c,a);}'));
      gl.linkProgram(p);gl.useProgram(p);
      var b=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,b);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      var loc=gl.getAttribLocation(p,'a');
      gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      var tex=gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      return function(){
        if(video.readyState<2)return;
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      };
    }

    var current=null;
    function build(){
      var mode=(window.innerWidth<=991)?'m':'d';
      if(mode===current)return;
      current=mode;
      box.innerHTML='';
      (mode==='m'?MOB:DESK).forEach(function(s){
        var w=d.createElement('div');
        w.style.cssText='position:absolute;left:'+s.l+';top:'+s.t+';width:'+s.sz+'px;height:'+s.sz+'px;transform:translate(-50%,-50%);filter:blur('+s.b+'px)';
        var poster=d.createElement('img');
        poster.src=BASE+'poster-'+s.v.replace('cloth-','')+'.png';
        poster.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%';
        w.appendChild(poster);
        if(hasAlpha){
          var v=makeVideo(BASE+s.v+'.webm');
          v.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%';
          w.appendChild(v);
          v.addEventListener('playing',function(){poster.style.display='none';});
          v.play&&v.play().catch(function(){v.remove();});
        }else{
          var sv=makeVideo(BASE+s.v+'-stack.mp4');
          var cv=d.createElement('canvas');
          cv.width=512;cv.height=512;
          cv.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%';
          w.appendChild(cv);
          var draw=glCompositor(cv,sv);
          if(draw){
            var playing=false,inView=true;
            new IntersectionObserver(function(e){inView=e[0].isIntersecting;}).observe(cv);
            var first=true;
            function loop(){
              if(playing&&inView){
                draw();
                if(first){first=false;poster.style.display='none';}
              }
              requestAnimationFrame(loop);
            }
            sv.play&&sv.play().then(function(){playing=true;}).catch(function(){});
            requestAnimationFrame(loop);
          }else{cv.remove();}
        }
        box.appendChild(w);
      });
    }
    var RT;addEventListener('resize',function(){clearTimeout(RT);RT=setTimeout(build,200);},{passive:true});
    build();
  }
  if(document.body)I();else addEventListener('DOMContentLoaded',I);
})();
