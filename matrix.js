(function(){
  if(window.txMatrix)return; window.txMatrix=1;
  var o=document.createElement('div');
  o.id='tx-mx-bg';
  o.style.cssText='position:fixed;top:0;left:50%;transform:translateX(-50%);width:min(1340px,calc(100vw - 40px));height:100vh;pointer-events:none;z-index:1;overflow:hidden;opacity:0.5';
  var c=document.createElement('canvas');
  c.style.cssText='display:block;width:100%;height:100%;filter:blur(0.6px)';
  o.appendChild(c);
  var vg=document.createElement('div');
  vg.style.cssText='position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center, transparent 45%, #10353C 100%)';
  o.appendChild(vg);
  (document.body||document.documentElement).appendChild(o);

  var x=c.getContext('2d');
  var D=Math.max(1,Math.min(2,devicePixelRatio||1));
  var W,H,fs,cols,rows,trail,glen,grid,drops,sp,prevHead,hdrops,htrail;
  var lastT=0;
  var TEXTYL=['T','E','X','T','Y','L'];
  var st=[];for(var s0=0;s0<6;s0++)st.push({w:'bold',lc:0,t:0});
  var txRow,txStartCol;
  var DROPS_PER_COL=2;

  function setup(){
    var r=c.getBoundingClientRect();
    W=Math.round(r.width);H=Math.round(r.height);
    c.width=Math.round(W*D);c.height=Math.round(H*D);
    x.setTransform(D,0,0,D,0,0);
    fs=Math.max(12,Math.round(W/85));
    cols=Math.ceil(W/fs);
    rows=Math.ceil(H/fs);
    trail=rows+6;
    glen=rows+trail+4;
    grid=[];drops=[];sp=[];prevHead=[];
    for(var i=0;i<cols;i++){
      grid[i]=[];
      for(var k=0;k<glen;k++)grid[i][k]=Math.random()<0.5?'0':'1';
      drops[i]=[];sp[i]=[];prevHead[i]=[];
      for(var d=0;d<DROPS_PER_COL;d++){
        drops[i][d]=Math.random()*(rows+trail)-trail*0.3;
        sp[i][d]=0.01+Math.random()*0.025;
        prevHead[i][d]=Math.floor(drops[i][d]);
      }
    }
    // horizontal lilac drops: every other row, alternating L/R direction, ~half the vertical density
    htrail=Math.max(8,Math.round(cols*0.4));
    hdrops=[];var hi=0;
    for(var rr=1;rr<rows;rr++){
      if(rr%5>=3)continue;          // ~60% of rows (was 50% every-other) -> +20% density
      var dir=(hi%2===0)?1:-1;
      hdrops.push({row:rr,dir:dir,x:dir>0?-Math.random()*cols:cols+Math.random()*cols,sp:0.015+Math.random()*0.03});
      hi++;
    }
    txRow=8;                       // dropped down 2 rows (was 6)
    txStartCol=Math.floor((cols-6)/2);
    x.textBaseline='top';
  }

  function tick(now){
    if(!lastT)lastT=now||0;
    var dt=Math.min(64,(now||0)-lastT);lastT=now||0;
    var dtF=dt/16.67;
    x.clearRect(0,0,W,H);
    var baseFont='bold '+fs+'px ui-monospace,"Courier New",monospace';
    x.font=baseFont;
    var topFadeY=H/3;
    // (additive blend removed: it brightened the whole matrix column vs the page bg)

    // vertical green/cyan
    for(var i=0;i<cols;i++){
      var xp=i*fs;
      for(var d=0;d<DROPS_PER_COL;d++){
        var hy=drops[i][d];
        for(var k=0;k<trail;k++){
          var row=Math.floor(hy)-k;
          if(row<0)continue;
          var y=row*fs;
          if(y>H)continue;
          if(row===txRow && i>=txStartCol && i<txStartCol+6)continue;
          var ch=grid[i][((row%glen)+glen)%glen];
          var a=k===0?0.55:Math.pow(1-k/trail,1.4)*0.55;
          if(y<topFadeY)a*=(0.35+0.65*(y/topFadeY));
          if(a<0.01)continue;
          x.fillStyle=k===0?'rgba(180,235,222,'+a.toFixed(3)+')':'rgba(92,221,198,'+a.toFixed(3)+')';
          x.fillText(ch,xp,y);
        }
        drops[i][d]+=sp[i][d]*dtF;
        if((Math.floor(hy)-trail)*fs>H){drops[i][d]=-Math.random()*trail-1-d*(rows/2);sp[i][d]=0.01+Math.random()*0.025;}
      }
      if(Math.random()<0.01)grid[i][Math.floor(Math.random()*glen)]=Math.random()<0.5?'0':'1';
    }

    // horizontal lilac threads
    for(var h=0;h<hdrops.length;h++){
      var hd=hdrops[h];var yy=hd.row*fs;
      if(yy<=H){
        for(var hk=0;hk<htrail;hk++){
          var col=Math.floor(hd.x)-hd.dir*hk;
          if(col<0||col>=cols)continue;
          if(hd.row===txRow && col>=txStartCol && col<txStartCol+6)continue;
          var ch2=grid[col][((hd.row%glen)+glen)%glen];
          var a2=hk===0?0.62:Math.pow(1-hk/htrail,1.4)*0.62;
          if(yy<topFadeY)a2*=(0.35+0.65*(yy/topFadeY));
          if(a2<0.01)continue;
          x.fillStyle=hk===0?'rgba(214,196,255,'+a2.toFixed(3)+')':'rgba(180,150,255,'+a2.toFixed(3)+')';
          x.fillText(ch2,col*fs,yy);
        }
      }
      hd.x+=hd.dir*hd.sp*dtF;
      if(hd.dir>0 && hd.x-htrail>cols){hd.x=-Math.random()*cols;hd.sp=0.015+Math.random()*0.03;}
      else if(hd.dir<0 && hd.x+htrail<0){hd.x=cols+Math.random()*cols;hd.sp=0.015+Math.random()*0.03;}
    }

    x.globalCompositeOperation='source-over';

    // TEXTYL: flicker when a vertical drop head passes through its row
    for(var li=0;li<6;li++){
      var col3=txStartCol+li;
      for(var d2=0;d2<DROPS_PER_COL;d2++){
        var cur=Math.floor(drops[col3][d2]);var prev=prevHead[col3][d2];
        if(prev<txRow && cur>=txRow){
          if(Math.random()<0.5)st[li].lc=1;else st[li].w='normal';
          st[li].t=2500;
        }
        prevHead[col3][d2]=cur;
      }
      if(st[li].t>0){st[li].t-=dt;if(st[li].t<=0){st[li].t=0;st[li].lc=0;st[li].w='bold';}}
    }
    // draw TEXTYL on top, full opacity
    for(var li2=0;li2<6;li2++){
      var col4=txStartCol+li2;var xp2=col4*fs;var y2=txRow*fs;
      var ch4=st[li2].lc?TEXTYL[li2].toLowerCase():TEXTYL[li2];
      x.font=st[li2].w+' '+fs+'px ui-monospace,"Courier New",monospace';
      x.fillStyle='rgba(92,221,198,1)';
      x.fillText(ch4,xp2,y2);
    }
    x.font=baseFont;
    requestAnimationFrame(tick);
  }
  function go(){setup();requestAnimationFrame(tick);}
  var T;addEventListener('resize',function(){clearTimeout(T);T=setTimeout(go,200);});
  go();
})();
