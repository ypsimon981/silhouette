/* Social web v1. No game RNG, timer, countdown or audio code lives here. */
(() => {
  'use strict';
  const config = window.SILHOUETTE_SOCIAL_CONFIG;
  const MODES = [1,2,4,7,8,9,10,11,12,13,17,18];
  const KEY = '10shapes_social_';
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(KEY+key)) ?? fallback; } catch { return fallback; } };
  const write = (key,value) => { try { localStorage.setItem(KEY+key,JSON.stringify(value)); } catch { /* Browser may deny persistence. */ } };
  const seconds = ms => (Math.round(ms/10)/100).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' s';
  const flowerLabel=()=>({it:'Fiori',en:'Flowers',fr:'Fleurs',es:'Flores',de:'Blumen',pt:'Flores',ja:'花',ko:'꽃','zh-CN':'花卉',id:'Bunga'})[document.documentElement.lang]||'Flowers';
  const label = mode => mode===18?flowerLabel():mode===17?'Animali':mode===14?'Overall':'Livello '+String(MODES.indexOf(mode)+1).padStart(2,'0');
  const shareTranslations={"it":["Condividi risultato","Condividi immagine","Scarica immagine","Copia link del gioco","Fai alla svelta o sei fritto!","10 patate. Riesci a battermi?","Livello","mondiale","Nuovo record personale","Il link viene condiviso come testo separato: alcune app accettano solo l’immagine. Puoi copiarlo qui."],"en":["Share result","Share image","Download image","Copy game link","Hurry up or you're fried!","10 potatoes. Can you beat me?","Level","worldwide","New personal best","The link is shared separately as text. Some apps accept only the image. Copy it here."],"es":["Compartir resultado","Compartir imagen","Descargar imagen","Copiar enlace del juego","¡Date prisa o acabarás frito!","10 patatas. ¿Puedes superarme?","Nivel","mundial","Nuevo récord personal","El enlace se comparte como texto aparte. Algunas apps solo aceptan imágenes. Cópialo aquí."],"fr":["Partager le résultat","Partager l’image","Télécharger l’image","Copier le lien du jeu","Dépêche-toi ou tu es frit !","10 patates. Tu peux me battre ?","Niveau","mondial","Nouveau record personnel","Le lien est partagé séparément. Certaines applis n’acceptent que l’image. Copie-le ici."],"de":["Ergebnis teilen","Bild teilen","Bild herunterladen","Spiellink kopieren","Beeil dich, sonst wirst du frittiert!","10 Kartoffeln. Schlägst du mich?","Level","weltweit","Neue persönliche Bestzeit","Der Link wird separat als Text geteilt. Manche Apps akzeptieren nur das Bild. Kopiere ihn hier."],"pt":["Partilhar resultado","Partilhar imagem","Descarregar imagem","Copiar ligação do jogo","Despacha-te ou ficas frito!","10 batatas. Consegues superar-me?","Nível","mundial","Novo recorde pessoal","A ligação é partilhada em texto separado. Algumas apps só aceitam imagens. Copia-a aqui."],"ja":["結果をシェア","画像をシェア","画像を保存","ゲームのリンクをコピー","急がないとフライドポテトに！","ジャガイモ10個。勝てるかな？","レベル","世界","自己ベスト更新","リンクは別のテキストとして共有されます。画像のみ対応のアプリもあります。"],"ko":["결과 공유","이미지 공유","이미지 저장","게임 링크 복사","서두르지 않으면 튀겨진다!","감자 10개. 나를 이길 수 있어?","레벨","세계","개인 최고 기록","링크는 별도 텍스트로 공유됩니다. 일부 앱은 이미지만 지원합니다."],"zh-CN":["分享成绩","分享图片","下载图片","复制游戏链接","快点，不然就炸熟啦！","10个土豆。你能打败我吗？","关卡","全球","个人新纪录","链接将作为单独文字分享，部分应用仅支持图片。"],"id":["Bagikan hasil","Bagikan gambar","Unduh gambar","Salin tautan game","Cepat, atau kamu jadi kentang goreng!","10 kentang. Bisa kalahkan aku?","Level","dunia","Rekor pribadi baru","Tautan dibagikan terpisah sebagai teks. Beberapa aplikasi hanya menerima gambar."]};
  const shareLanguage=()=>{const raw=window.PotatoesI18n?.language||localStorage.getItem('10potatoes_language')||navigator.language||'en';const code=String(raw).replace('_','-').toLowerCase();return code.startsWith('zh')?'zh-CN':(shareTranslations[code.split('-')[0]]?code.split('-')[0]:'en');};
  const tr=(i)=>shareTranslations[shareLanguage()][i];
  const levelName=mode=>mode===18?flowerLabel():mode===17?'Animali':mode===14?'Overall':tr(6)+' '+String(MODES.indexOf(mode)+1).padStart(2,'0');
  const logoWords={it:'POTATOES',en:'POTATOES',es:'PATATAS',fr:'PATATES',de:'KARTOFFELN',pt:'BATATAS',ja:'ポテト',ko:'감자','zh-CN':'土豆',id:'KENTANG'};
  const extraShare={it:['Chiudi','Formato immagine','Verticale','Quadrato','Anteprima del risultato'],en:['Close','Image format','Portrait','Square','Result preview'],es:['Cerrar','Formato de imagen','Vertical','Cuadrado','Vista previa del resultado'],fr:['Fermer','Format de l’image','Portrait','Carré','Aperçu du résultat'],de:['Schließen','Bildformat','Hochformat','Quadratisch','Ergebnisvorschau'],pt:['Fechar','Formato da imagem','Vertical','Quadrado','Pré-visualização do resultado'],ja:['閉じる','画像形式','縦長','正方形','結果のプレビュー'],ko:['닫기','이미지 형식','세로','정사각형','결과 미리보기'],'zh-CN':['关闭','图片格式','竖版','方形','成绩预览'],id:['Tutup','Format gambar','Potret','Persegi','Pratinjau hasil']};
  const tx=i=>extraShare[shareLanguage()][i];
  const artCache=new Map();
  function shareArt(path){
    if(!artCache.has(path))artCache.set(path,new Promise(resolve=>{
      const img=new Image();const timer=setTimeout(()=>resolve(null),4000);
      img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);artCache.delete(path);resolve(null);};img.src=path;
    }));return artCache.get(path);
  }
  function potatoLogo(g,h,logo){
    g.save();g.textAlign='center';g.shadowColor='#180800';g.shadowBlur=5;g.shadowOffsetY=7;
    if(logo&&['it','en'].includes(shareLanguage()))g.drawImage(logo,540-h*.27,h*.028,h*.54,h*.18);
    else {g.fillStyle='#ffe6ad';g.strokeStyle='#8a4b20';g.lineWidth=5;g.font='900 105px system-ui';const name='10 '+logoWords[shareLanguage()];g.strokeText(name,540,h*.16,930);g.fillText(name,540,h*.16,930);}
    g.restore();
  }
  const defaults = {challenges:true,digest:true,digest_time:'19:00',show_name:true,analytics:false};
  let prefs={...defaults,...read('preferences',{})}, bridge, active=null, ticket=null, last=null, generation=0, authFlight=null, submitting=null;
  let startPending=false, shareUrl=null, profileReady=false, pendingCode=null, rankingTarget=null;
  const node = (tag,text,cls) => { const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e; };
  const button = (text,fn) => {const b=node('button',text);b.type='button';b.onclick=fn;return b;};
  const errorText = e => e?.message || 'Operazione non disponibile. Riprova con una connessione attiva.';
  function toast(text){let e=document.getElementById('social-toast');if(!e){e=node('div',undefined);e.id='social-toast';e.setAttribute('role','status');document.body.append(e);}e.textContent=text;clearTimeout(e._timer);e._timer=setTimeout(()=>e.remove(),6000);}
  function dialog(title){
    document.querySelectorAll('.social-dialog').forEach(e=>e.close());
    const d=node('dialog',undefined,'social-dialog');const previous=document.activeElement;
    d.append(button('×',()=>d.close()),node('h2',title));d.firstChild.className='social-close';d.firstChild.setAttribute('aria-label','Chiudi');
    d.addEventListener('close',()=>{d.remove();previous?.focus?.();},{once:true});document.body.append(d);d.showModal();return d;
  }
  async function json(url,options={}){
    const response=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});
    let data;try{data=await response.json();}catch{throw Error('Risposta del server non valida.');}
    if(!response.ok)throw Error(data.error_description||data.msg||data.error||'Servizio temporaneamente non disponibile.');return data;
  }
  async function session(){
    if(!config.enabled)throw Error('Le sfide online non sono ancora attive. Puoi già condividere l’immagine del risultato.');
    if(authFlight)return authFlight;
    const work=async()=>{
      let s=read('session',null);
      if(!s||s.expires_at*1000<Date.now()+60000){
        const refresh=!!s?.refresh_token;
        s=await json(config.supabaseUrl+'/auth/v1/'+(refresh?'token?grant_type=refresh_token':'signup'),{
          method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},
          body:JSON.stringify(refresh?{refresh_token:s.refresh_token}:{data:{}})
        });
        if(!s.access_token||!s.user?.id)throw Error('Accesso anonimo non disponibile. Il gioco locale resta utilizzabile.');
        s.expires_at=s.expires_at||Math.floor(Date.now()/1000)+s.expires_in;write('session',s);
      }
      bridge.identity(s.user.id);return s;
    };
    authFlight=(navigator.locks?navigator.locks.request(KEY+'auth',work):work()).finally(()=>{authFlight=null;});return authFlight;
  }
  async function api(action,data={}){
    const s=await session();return json(config.supabaseUrl+'/functions/v1/ten-shapes-social',{
      method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify({action,data})});
  }
  async function ensureProfile(){
    if(profileReady)return;
    const result=await api('profile',{...bridge.profile(),preferences:prefs,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'});
    prefs={...prefs,...result.preferences};write('preferences',prefs);profileReady=true;
  }
  async function event(name,extra={}){if(!prefs.analytics||!config.enabled)return;try{await api('event',{name,event_id:crypto.randomUUID(),...extra});}catch{/* Nonessential telemetry never blocks play. */}}
  function link(code){const u=new URL(config.publicUrl);u.hash='c/'+code;return u.href;}
  function getCode(){const h=location.hash;return /^#c\/[0-9a-f]{32}$/.test(h)?h.slice(3):null;}
  async function openChallenge(code){
    if(!/^[0-9a-f]{32}$/.test(code)){toast('Link della sfida non valido.');return;}
    const d=dialog('Sfida ricevuta');const status=node('p','Caricamento…');d.append(status);
    try{
      await ensureProfile();const c=await api('challenge_get',{code});if(!d.isConnected)return;
      status.textContent=(c.nickname||'Un giocatore')+' vuole metterti alla prova';
      d.append(node('div',label(c.level).toUpperCase(),'target-level'),node('p','TEMPO DA BATTERE','target-level'),node('div',seconds(c.time_ms),'target-time'),node('p','Riesci a fare meglio? Ogni tentativo usa nuove forme casuali.','social-note'));
      d.append(button('ACCETTA LA SFIDA',()=>{active=c;d.close();bridge.play(c.level);}),button('GIOCA PIÙ TARDI',()=>{
        const saved=read('pending',[]).filter(x=>x!==code);write('pending',[code,...saved].slice(0,30));d.close();toast('Sfida salvata nel Profilo → Sfide e traguardi.');}));
      event('challenge_link_opened',{code});
    }catch(e){status.textContent=errorText(e);d.append(button('Riprova',()=>openChallenge(code)));}
  }
  async function begin(mode){
    if(startPending)return false;
    ticket=null;submitting=null;last=null;
    if(active&&active.level!==mode)active=null;
    if(!config.enabled||!MODES.includes(mode))return true;
    startPending=true;const gen=generation;
    try{
      await ensureProfile();const t=await api('run_start',{level:mode,code:active?.code||null,rules:config.rulesVersion});
      if(gen!==generation)return false;ticket={...t,receivedAt:performance.now()};return true;
    }catch(e){
      if(gen!==generation)return false;
      if(active){toast(errorText(e));return false;}
      toast('Partita locale: il risultato non potrà creare una sfida online.');return gen===generation;
    }finally{if(gen===generation)startPending=false;}
  }
  function resetAttempt(mode){generation++;startPending=false;ticket=null;submitting=null;if(active&&active.level!==mode)active=null;}
  function leave(){resetAttempt(null);active=null;}
  function finish(result){
    generation++;startPending=false; // A late run_start response must not attach to a finished attempt.
    const run=ticket;ticket=null;const challenge=active;
    last={...result,challenge,run_id:run?.id,verified:false};const current=last;
    renderRematch();
    document.getElementById('social-actions').hidden=!result.won;
    const status=document.getElementById('social-result');status.textContent='';
    if(pendingCode){const code=pendingCode;pendingCode=null;setTimeout(()=>openChallenge(code),0);}
    if(!result.won){if(run)api('run_abort',{id:run.id}).catch(()=>{});return;}
    event('result_viewed',{level:result.mode});
    const gain=result.previous>0?result.previous-result.ms:0;
    if(!result.previous)status.textContent='Primo completamento!';else if(gain>0)status.textContent='Nuovo record personale · −'+seconds(gain);
    // Local cards are available offline, but challenge creation requires a verified run.
    if(!run)return;
    status.textContent='Verifica risultato…';
    // run_start now overlaps the countdown. Preserve the server's elapsed-time
    // check by waiting only on the result screen, using ticket receipt as a
    // conservative lower bound for the server run age.
    const remaining=Math.max(0,Math.ceil(Math.round(result.ms)+2550-(performance.now()-run.receivedAt)));
    submitting=new Promise(resolve=>setTimeout(resolve,remaining)).then(()=>api('run_finish',{id:run.id,time_ms:Math.round(result.ms),hand:bridge.profile().hand})).then(data=>{
      current.verified=true;current.server=data;
      if(result.sectorAttempt?.sectors)api('performance_sectors',{id:run.id,sectors:result.sectorAttempt.sectors}).then(receipt=>bridge.sectorsVerified?.(result.sectorAttempt,receipt)).catch(()=>{});
      if(last!==current)return data;
      const lines=[];
      if(challenge){lines.push(data.outcome==='won'?'HAI VINTO!':data.outcome==='tie'?'PARITÀ':'SFIDA NON SUPERATA');lines.push('Differenza: '+seconds(Math.abs(data.difference_ms)));}
      if(data.achievements?.length)lines.push(data.achievements[0].title);
      status.textContent=lines.join('\n');renderRematch();return data;
    }).catch(e=>{if(last===current)status.textContent='Risultato locale salvato. '+errorText(e);return null;});
  }
  async function score(ms,mode,series=false){
    if(!config.enabled)return undefined;
    if(!series&&last&&last.mode===mode&&Math.round(last.ms)===Math.round(ms))return submitting?await submitting:null;
    if(!series)return null;
    // Overall and stage scores keep the existing rules and authenticated ranking endpoint.
    try{
      await ensureProfile();const s=await session(),p=bridge.profile();
      return await json(config.supabaseUrl+'/functions/v1/ten-shapes-ranking',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},body:JSON.stringify({action:'score',player_id:s.user.id,nickname:p.nickname,country:p.country,level:mode,time_ms:Math.round(ms),playing_hand:p.hand})});
    }catch{return null;}
  }
  async function profile(nickname,country){
    if(!config.enabled){write('preferences',prefs);return undefined;}
    const data=await api('profile',{...bridge.profile(),nickname,country,preferences:prefs,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',update_preferences:true});profileReady=true;return data;
  }
  async function createChallenge(){
    if(!last?.won)return;
    const result=last;
    if(!MODES.includes(result.mode)){toast('Le sfide V1 sono disponibili sui singoli livelli.');return;}
    try{
      if(submitting)await submitting;
      if(!result.verified)throw Error('Per creare una sfida serve una partita completata online con le sfide attive.');
      const c=await api('challenge_create',{run_id:result.run_id,parent_code:result.challenge?.code||null});
      event(result.challenge?'rematch_share_clicked':'share_clicked',{code:c.code});
      await shareText(label(result.mode)+' · '+seconds(result.ms)+'. Riesci a battermi?',link(c.code),result.challenge?'rematch_shared':'share_handoff',c.code);
    }catch(e){toast(errorText(e));}
  }
  async function shareText(text,url,eventName,code){
    // This second explicit tap preserves user activation after asynchronous server work.
    const d=dialog('Condividi la sfida');const content=text+'\n'+url;
    const area=node('textarea');area.readOnly=true;area.value=content;d.append(area);
    const send=button('Condividi',async()=>{send.disabled=true;try{if(navigator.share){await navigator.share({title:config.brand,text,url});event(eventName,{code});d.close();toast('Condivisione completata.');}else{await navigator.clipboard.writeText(content);d.close();toast('Testo copiato.');}}catch(e){if(e.name!=='AbortError')toast('Seleziona e copia il testo qui sopra.');}finally{send.disabled=false;}});
    d.append(send,button('Copia link',async()=>{try{await navigator.clipboard.writeText(url);d.close();toast('Link copiato.');}catch{area.select();}}));
  }
  function ranking(mode,score,state='ready'){
    const area=document.getElementById('social-ranking-challenge'),note=document.getElementById('social-ranking-record'),send=document.getElementById('social-ranking-send');
    const share=document.getElementById('social-ranking-share');share.textContent=tr(0);share.disabled=true;
    rankingTarget=null;send.disabled=true;area.hidden=!MODES.includes(mode);
    if(area.hidden)return;
    if(state==='loading'){note.textContent='Caricamento del tuo record…';return;}
    if(!score){note.textContent=state==='error'?'Record online temporaneamente non disponibile.':'Completa una partita online per sfidare un amico con il tuo record in questo livello.';return;}
    rankingTarget={mode,time_ms:score.time_ms};share.disabled=false;
    note.textContent=(mode===18?flowerLabel():mode===17?'Animali':mode===14?'Overall':'Liv. '+(MODES.indexOf(mode)+1))+' · Il tuo record: '+seconds(score.time_ms);
    send.textContent='Sfida un amico';send.disabled=!config.enabled;
  }
  async function challengeFromRanking(){
    if(!rankingTarget)return;const target={...rankingTarget},send=document.getElementById('social-ranking-send');send.disabled=true;
    try{
      await ensureProfile();const c=await api('challenge_best',{level:target.mode});
      event('share_clicked',{level:c.level,code:c.code});
      await shareText('Il mio record · '+label(c.level)+': '+seconds(c.time_ms)+'. Riesci a battermi?',link(c.code),'share_handoff',c.code);
    }catch(e){toast(errorText(e));}
    finally{send.disabled=!rankingTarget||!config.enabled;}
  }
  async function globalShareRank(result){
    if(!config.enabled)return null;
    const id=read('session',null)?.user?.id||localStorage.getItem('10shapes_player_id');if(!id)return null;
    try{
      const params=new URLSearchParams({level:String(result.mode),scope:'world',player_id:id,country:bridge.profile().country||'IT'});
      const response=await fetch(config.supabaseUrl+'/functions/v1/ten-shapes-ranking?'+params,{signal:AbortSignal.timeout(4000)});
      if(!response.ok)return null;const data=await response.json();
      return Number.isInteger(Number(data.my_rank))&&Number(data.my_rank)>0?{rank:Number(data.my_rank),total:Number(data.total)}:null;
    }catch{return null;}
  }
  function rankPlaque(g,h,rank){
    const x=365,y=h*.818,w=350,height=h*.108;
    g.save();g.shadowColor='#3a1709';g.shadowBlur=8;g.shadowOffsetY=5;
    const skin=g.createLinearGradient(x,y,x,y+height);skin.addColorStop(0,'#ffe2a0');skin.addColorStop(1,'#d69944');
    g.fillStyle=skin;g.beginPath();g.roundRect(x,y,w,height,25);g.fill();
    g.shadowBlur=0;g.shadowOffsetY=0;g.strokeStyle='#b6752c';g.lineWidth=3;g.stroke();
    for(let i=0;i<75;i++){g.fillStyle=i%2?'#af722c55':'#fff0bb80';g.beginPath();g.ellipse(x+12+(i*73)%(w-24),y+8+(i*41)%(height-16),1+i%3,1+i%2,i,0,Math.PI*2);g.fill();}
    const text=rank?'#'+rank:'—';g.textAlign='center';g.font='900 76px system-ui';
    g.fillStyle='#ffe6ac';g.fillText(text,541,y+height*.74+2,w-28);
    g.fillStyle='#693109';g.shadowColor='#8b521e';g.shadowBlur=2;g.shadowOffsetY=-2;g.fillText(text,540,y+height*.74,w-28);g.restore();
  }
  async function card(result,shape,achievement){
    const c=document.createElement('canvas');c.width=1080;c.height=shape==='portrait'?1350:1080;
    const g=c.getContext('2d'),h=c.height;
    const [art,logo]=await Promise.all([shareArt('./assets/brand/share-celebration.webp'),shareArt('./assets/brand/10potatoes-logo-transparent.png')]);
    const bg=g.createLinearGradient(0,0,1080,h);bg.addColorStop(0,'#572c18');bg.addColorStop(1,'#301308');g.fillStyle=bg;g.fillRect(0,0,1080,h);
    if(art)g.drawImage(art,0,0,1080,h);
    potatoLogo(g,h,logo);
    g.textAlign='center';g.fillStyle='#ffedc4';g.shadowColor='#160800';g.shadowBlur=4;g.shadowOffsetY=5;
    g.font='900 49px system-ui';g.fillText(levelName(result.mode).toUpperCase(),540,h*.335,940);
    g.font='900 168px system-ui';g.fillText((Math.round(result.ms/10)/100).toLocaleString(shareLanguage(),{minimumFractionDigits:2,maximumFractionDigits:2})+' s',540,h*.49,940);
    g.font='bold 49px system-ui';if(prefs.show_name)g.fillText(bridge.profile().nickname,540,h*.55,930);
    g.font='bold 40px system-ui';g.fillStyle='#ffc656';
    if(achievement)g.fillText(achievement,540,h*.605,930);
    else if(result.globalRank?.rank)g.fillText('🌐 N° '+result.globalRank.rank+'/'+result.globalRank.total+' · '+tr(7),540,h*.605,930);
    else if(!result.previous||result.ms<result.previous){g.font='bold 36px system-ui';g.fillText(tr(8),540,h*.605,930);}
    g.shadowBlur=0;g.shadowOffsetY=0;rankPlaque(g,h,result.globalRank?.rank);
    return new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(Error('Impossibile generare l’immagine.')),'image/png'));
  }
  async function shareResult(achievement,provided){
    const original=provided||last;if(!original?.won)return;const result={...original};
    const rankReady=globalShareRank(result).then(rank=>{result.globalRank=rank;});
    event(achievement?'achievement_share_clicked':'share_clicked',{level:result.mode});
    const d=dialog(achievement||tr(0)),select=node('select');
    d.classList.add('potato-share');d.firstChild.setAttribute('aria-label',tx(0));
    for(const [v,t] of [['portrait',tx(2)+' · 1080 × 1350'],['square',tx(3)+' · 1080 × 1080']]){const o=node('option',t);o.value=v;select.append(o);}
    select.setAttribute('aria-label',tx(1));const preview=node('img');preview.alt=tx(4);
    const note=node('p',tr(9),'social-note');
    let file=null,version=0;const send=button(tr(1),async()=>{
      if(!file)return;
      send.disabled=true;
      try{
        if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:config.brand,text:levelName(result.mode)+' · '+seconds(result.ms)+'\n'+config.publicUrl});event(achievement?'achievement_shared':'share_handoff',{level:result.mode});d.close();toast('Condivisione completata.');}
        else {const a=node('a');a.href=shareUrl;a.download=file.name;a.click();d.close();toast('Immagine scaricata. Condividila dall’app che preferisci.');}
      }catch(e){if(e.name!=='AbortError')toast('Condivisione non riuscita. Usa Scarica immagine.');}finally{send.disabled=false;}
    });
    const download=button(tr(2),()=>{if(file){const a=node('a');a.href=shareUrl;a.download=file.name;a.click();d.close();toast('Immagine scaricata.');}});
    const build=async()=>{const id=++version;send.disabled=true;download.disabled=true;try{await rankReady;const blob=await card(result,select.value,achievement);if(id!==version||!d.isConnected)return;if(!blob)throw Error('Impossibile generare l’immagine.');if(shareUrl)URL.revokeObjectURL(shareUrl);shareUrl=URL.createObjectURL(blob);file=new File([blob],'10Potatoes-'+select.value+'.png',{type:'image/png'});preview.src=shareUrl;send.disabled=false;download.disabled=false;}catch(e){note.textContent=errorText(e);}};
    const actions=node('div',undefined,'potato-share-actions');send.className='potato-share-send';download.className='potato-share-download';actions.append(send,download);
    select.onchange=build;d.append(preview,select,actions,note,button(tr(3),async()=>{try{await navigator.clipboard.writeText(config.publicUrl);toast('Link copiato.');}catch{const a=node('textarea');a.value=config.publicUrl;d.append(a);a.select();}}));
    d.addEventListener('close',()=>{version++;if(shareUrl){const finishedUrl=shareUrl;shareUrl=null;setTimeout(()=>URL.revokeObjectURL(finishedUrl),1000);}});build();
  }
  function renderRematch(){const b=document.getElementById('social-rematch');b.hidden=!last?.challenge;}
  async function inbox(){
    const d=dialog('Sfide e traguardi');
    for(const code of read('pending',[])){const row=node('div',undefined,'social-item');row.append(button('Apri sfida salvata',()=>openChallenge(code)),button('Rimuovi',()=>{write('pending',read('pending',[]).filter(x=>x!==code));row.remove();}));d.append(row);}
    const status=node('p','Caricamento…','social-note');d.append(status);
    try{
      await ensureProfile();const data=await api('inbox');if(!d.isConnected)return;
      status.textContent='Avvisi nel gioco. Le notifiche push non sono ancora disponibili.';
      for(const n of data.notices){const row=node('div',undefined,'social-item');row.append(node('strong',n.title),node('p',n.body));if(n.code)row.append(button('Gioca la rivincita',()=>openChallenge(n.code)));else row.append(button('Analisi performance',()=>{d.close();bridge.performance();}));d.append(row);}
      for(const a of data.achievements){const row=node('div',undefined,'social-item');row.append(node('strong',a.title+' · '+label(a.level)),button('Condividi traguardo',()=>shareResult(a.title,{won:true,mode:a.level,ms:a.time_ms})));d.append(row);}
      if(!data.notices.length&&!data.achievements.length)status.textContent+='\nCompleta una partita online per iniziare.';
    }catch(e){status.textContent=errorText(e);}
  }
  async function history(){
    const area=document.getElementById('social-history');area.textContent='Ranking rispetto a 24 ore fa: caricamento…';
    try{await ensureProfile();const d=await api('ranking_changes');area.textContent='Ranking mondiale · ultime 24 ore\n'+(d.changes.length?d.changes.map(x=>label(x.level)+': '+(x.delta>0?'+':'')+x.delta+' posizioni ('+x.before_rank+' → '+x.rank+')'+(x.band_before!==x.band?' · '+(x.band?'Top '+x.band+'%':'uscita dalla Top 10%'):'')).join('\n'):'Nessuna variazione, oppure storico di 24 ore non ancora sufficiente.');}catch(e){area.textContent=errorText(e);}
  }
  function init(game){
    bridge=game;
    const restored=read('session',null);if(config.enabled&&restored?.user?.id)bridge.identity(restored.user.id);
    const actions=node('div',undefined,'social-actions');actions.id='social-actions';actions.hidden=true;
    const share=button('Condividi',()=>shareResult());share.setAttribute('aria-label','Condividi risultato');
    const challenge=button('Sfida',createChallenge);challenge.setAttribute('aria-label','Sfida un amico');
    actions.append(share,challenge);
    const rematch=button('Invia rivincita',createChallenge);rematch.id='social-rematch';rematch.hidden=true;actions.append(rematch);
    const status=node('p',undefined);status.id='social-result';status.setAttribute('role','status');
    const finishActions=document.querySelector('#finish .finishActions');finishActions.append(actions,status);
    const field=node('fieldset');field.id='social-preferences';field.append(node('legend','Social e notifiche'));
    for(const [key,title] of [['challenges','Sfide e rivincite'],['digest','Riepilogo classifiche'],['show_name','Mostra il nome nelle condivisioni'],['analytics','Statistiche social facoltative']]){
      const line=node('label'),input=node('input');input.type='checkbox';input.checked=prefs[key];input.onchange=()=>{prefs[key]=input.checked;write('preferences',prefs);};line.append(input,document.createTextNode(title));field.append(line);
    }
    const time=node('input');time.type='time';time.value=prefs.digest_time;time.onchange=()=>{if(time.value){prefs.digest_time=time.value;write('preferences',prefs);}};
    const tl=node('label','Orario riepilogo');tl.append(time);field.append(tl,node('small','Preferenze per gli avvisi nel gioco. Push non disponibili: saranno attivate con l’app mobile e il consenso del sistema. Le impostazioni online si salvano con “Salva profilo”.'),node('small','Il profilo social è legato a questo browser. Cancellando i dati perderai l’accesso; il recupero su altri dispositivi non è ancora disponibile.'));
    if(!config.enabled)field.append(node('small','Le sfide online non sono ancora attive. Puoi già condividere le immagini dei risultati.'));
    field.append(button('Sfide e traguardi',inbox));document.getElementById('sendScore').before(field);
    const area=node('section');area.id='social-history';area.textContent='Confronto delle classifiche nelle ultime 24 ore.';document.getElementById('progressStats').before(area,button('Aggiorna confronto',history));
    const rankArea=node('section');rankArea.id='social-ranking-challenge';rankArea.hidden=true;
    const recordNote=node('p');recordNote.id='social-ranking-record';const rankSend=button('Sfida un amico',challengeFromRanking);rankSend.id='social-ranking-send';rankSend.disabled=true;
    const rankShare=button(tr(0),()=>{if(!rankingTarget)return;const target={...rankingTarget};shareResult(null,{won:true,mode:target.mode,ms:target.time_ms,previous:target.time_ms});});rankShare.id='social-ranking-share';rankShare.disabled=true;
    const rankActions=node('div',undefined,'social-ranking-actions');rankActions.append(rankShare,rankSend);
    rankArea.append(recordNote,rankActions);document.getElementById('rankSpotlight').after(rankArea);
    window.addEventListener('hashchange',()=>{const c=getCode();if(bridge.playing()){pendingCode=c;toast(c?'Il link verrà aperto dopo la partita.':'Link della sfida non valido.');return;}if(c)openChallenge(c);else if(location.hash.startsWith('#c'))toast('Link della sfida non valido.');});
    const c=getCode();if(c)setTimeout(()=>openChallenge(c),0);else if(location.hash.startsWith('#c'))toast('Link della sfida non valido.');
    return {cognitive:async(action,data={},owner)=>{await ensureProfile();const s=read('session',null);if(owner&&s?.user?.id!==owner)throw Error('Profilo cambiato');return api('cognitive_'+action,data);},currentRunId:()=>ticket?.id||null,begin,requiresOnlineStart:()=>!!active,finish,leave,resetAttempt,score,profile,history,ranking,openPending:()=>{const c=getCode();if(c)openChallenge(c);}};
  }
  window.SilhouetteSocial={init};
})();


