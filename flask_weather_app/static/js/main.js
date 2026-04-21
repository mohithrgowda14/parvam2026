const CUR_KEY='skylog_current';
let currentUser=null;let tempChart=null;let condChart=null;let humChart=null;
let calYear=new Date().getFullYear();let calMonth=new Date().getMonth();
let selectedDates=[];let currentLogs=[];let currentTrips=[];

function showToast(msg,icon='✅'){
  const t=document.getElementById('toast');
  t.innerHTML=icon+' '+msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

function switchAuth(mode){
  document.getElementById('loginForm').style.display=mode==='login'?'block':'none';
  document.getElementById('registerForm').style.display=mode==='register'?'block':'none';
  document.querySelectorAll('.auth-tab').forEach((t,i)=>t.classList.toggle('active',(mode==='login'&&i===0)||(mode==='register'&&i===1)));
  document.getElementById('authErr').style.display='none';
}

function showErr(msg){const e=document.getElementById('authErr');e.textContent=msg;e.style.display='block';}

async function doRegister(){
  const name=document.getElementById('regName').value.trim();
  const email=document.getElementById('regEmail').value.trim();
  const loc=document.getElementById('regLocation').value.trim();
  const pass=document.getElementById('regPass').value;
  if(!name||!email||!loc||!pass){showErr('All fields required');return;}
  if(pass.length<6){showErr('Password must be at least 6 characters');return;}
  
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({name, email, loc, pass})
  });

  if (!res.ok) {
    const data = await res.json();
    showErr(data.error || 'Registration failed');
    return;
  }

  showErr('');showToast('Account created! Please sign in.','🎉');switchAuth('login');
  document.getElementById('loginEmail').value=email;
}

async function doLogin(){
  const email=document.getElementById('loginEmail').value.trim();
  const pass=document.getElementById('loginPass').value;
  if(!email||!pass){showErr('Please enter credentials');return;}
  
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({email, pass})
  });

  if (!res.ok) {
    const data = await res.json();
    showErr(data.error || 'Invalid email or password');
    return;
  }

  const data = await res.json();
  currentUser=data.user;
  localStorage.setItem(CUR_KEY, JSON.stringify(currentUser));
  loadApp();
}

function doLogout(){
  currentUser=null;localStorage.removeItem(CUR_KEY);
  document.getElementById('authWrap').style.display='flex';
  document.getElementById('mainApp').style.display='none';
}

async function loadApp(){
  document.getElementById('authWrap').style.display='none';
  document.getElementById('mainApp').style.display='flex';
  document.getElementById('navName').textContent=currentUser.name.split(' ')[0];
  document.getElementById('navAvatar').textContent=currentUser.name[0].toUpperCase();
  const today=new Date().toISOString().split('T')[0];
  document.getElementById('logDate').value=today;
  document.getElementById('logLocation').value=currentUser.loc||'';
  document.getElementById('locationSearch').value=currentUser.loc||'Chennai';
  
  await fetchLogs();
  await fetchTrips();
  
  renderDashboard();fetchCurrentWeather();renderCalendar();renderTrips();
}

async function fetchLogs() {
  const res = await fetch('/api/logs?email=' + encodeURIComponent(currentUser.email));
  currentLogs = await res.json();
}

async function fetchTrips() {
  const res = await fetch('/api/trips?email=' + encodeURIComponent(currentUser.email));
  currentTrips = await res.json();
}

// ======= WEATHER API (open-meteo) =======
async function fetchCurrentWeather(){
  const city=document.getElementById('locationSearch').value.trim()||'Chennai';
  document.getElementById('heroCity').textContent=city;
  document.getElementById('heroCond').textContent='Fetching...';
  document.getElementById('heroTemp').textContent='--';
  document.getElementById('heroEmoji').textContent='⏳';
  try{
    const geoRes=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geoData=await geoRes.json();
    if(!geoData.results||geoData.results.length===0){document.getElementById('heroCond').textContent='City not found';return;}
    const {latitude,longitude,name}=geoData.results[0];
    document.getElementById('heroCity').textContent=name;
    const wRes=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,windspeed_10m,apparent_temperature,weathercode&timezone=auto`);
    const wData=await wRes.json();
    const c=wData.current;
    const code=c.weathercode;
    let cond='Cloudy',emoji='☁️';
    if(code<=1){cond='Sunny';emoji='☀️';}
    else if(code<=3){cond='Partly Cloudy';emoji='⛅';}
    else if(code>=51&&code<=82){cond='Rainy';emoji='🌧️';}
    else if(code>=95){cond='Stormy';emoji='⛈️';}
    document.getElementById('heroTemp').textContent=Math.round(c.temperature_2m);
    document.getElementById('heroCond').textContent=cond;
    document.getElementById('heroHum').textContent=c.relative_humidity_2m+'%';
    document.getElementById('heroWind').textContent=Math.round(c.windspeed_10m);
    document.getElementById('heroFeel').textContent=Math.round(c.apparent_temperature)+'°C';
    document.getElementById('heroEmoji').textContent=emoji;
  }catch(e){document.getElementById('heroCond').textContent='Unable to load weather';}
}

// ======= LOGS =======
async function addLog(){
  const date=document.getElementById('logDate').value;
  const location=document.getElementById('logLocation').value.trim();
  const temp=parseFloat(document.getElementById('logTemp').value);
  const condition=document.getElementById('logCondition').value;
  const humidity=parseInt(document.getElementById('logHumidity').value);
  if(!date||!location||isNaN(temp)||isNaN(humidity)){showToast('Fill all fields','⚠️');return;}
  if(humidity<0||humidity>100){showToast('Humidity must be 0–100','⚠️');return;}
  
  const entry={id:Date.now(),user:currentUser.email,date,location,temp,condition,humidity};
  
  await fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });

  await fetchLogs();
  renderDashboard();showToast('Weather log added!');
  document.getElementById('logTemp').value='';document.getElementById('logHumidity').value='';
}

function getCondEmoji(c){return c==='Sunny'?'☀️':c==='Rainy'?'🌧️':'☁️';}
function getCondClass(c){return c==='Sunny'?'sunny':c==='Rainy'?'rainy':'cloudy';}

function renderDashboard(){
  const logs=[...currentLogs].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const n=logs.length;
  const last7=logs.slice(0,7);
  const avg7=last7.length?last7.reduce((s,l)=>s+l.temp,0)/last7.length:null;
  const avgHum=n?Math.round(logs.reduce((s,l)=>s+l.humidity,0)/n):0;
  const maxTemp=n?Math.max(...logs.map(l=>l.temp)):null;

  document.getElementById('stat7avg').textContent=avg7!=null?Math.round(avg7)+'°':'--°';
  document.getElementById('statTotal').textContent=n;
  document.getElementById('statHum').textContent=n?avgHum+'%':'--%';
  document.getElementById('statMax').textContent=maxTemp!=null?maxTemp+'°':'--°';

  if(avg7!=null){
    document.getElementById('avgBanner').style.display='flex';
    document.getElementById('avgNum').textContent=avg7.toFixed(1)+'°C';
  } else {document.getElementById('avgBanner').style.display='none';}

  // Table
  const tbody=document.getElementById('logTbody');
  if(n===0){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:2rem">No logs yet. Add your first entry!</td></tr>';return;}
  tbody.innerHTML=logs.map(l=>{
    const isHot=l.temp>40;
    return`<tr class="${isHot?'hot-row':''}">
      <td><strong>${l.date}</strong></td>
      <td>📍 ${l.location}</td>
      <td style="font-weight:700;color:${isHot?'#ef4444':l.temp>35?'#f59e0b':'#0ea5e9'}">${l.temp}°C ${isHot?'🔥':''}</td>
      <td><span class="badge ${getCondClass(l.condition)}">${getCondEmoji(l.condition)} ${l.condition}</span></td>
      <td>${l.humidity}%</td>
      <td>${isHot?'<span class="badge" style="background:#fee2e2;color:#dc2626">🌡️ Extreme</span>':'<span class="badge" style="background:#f0fdf4;color:#166534">✓ Normal</span>'}</td>
    </tr>`;
  }).join('');

  renderCharts(logs);
}

function renderCharts(logs){
  const rev=[...logs].reverse().slice(-12);
  const labels=rev.map(l=>l.date.slice(5));
  const temps=rev.map(l=>l.temp);
  const hums=rev.map(l=>l.humidity);

  // Temp chart
  if(tempChart)tempChart.destroy();
  const tc=document.getElementById('tempChart');
  if(tc){
    tempChart=new Chart(tc,{
      type:'line',
      data:{labels,datasets:[{label:'Temperature °C',data:temps,borderColor:'#0ea5e9',backgroundColor:'rgba(14,165,233,.1)',borderWidth:2.5,tension:.4,fill:true,pointBackgroundColor:temps.map(t=>t>40?'#ef4444':'#0ea5e9'),pointRadius:4}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:'rgba(0,0,0,.04)'},ticks:{color:'#64748b',font:{size:11}}},x:{grid:{display:false},ticks:{color:'#64748b',font:{size:11}}}}}
    });
  }

  // Cond donut
  const sunny=logs.filter(l=>l.condition==='Sunny').length;
  const rainy=logs.filter(l=>l.condition==='Rainy').length;
  const cloudy=logs.filter(l=>l.condition==='Cloudy').length;
  if(condChart)condChart.destroy();
  const cc=document.getElementById('condChart');
  if(cc){
    condChart=new Chart(cc,{
      type:'doughnut',
      data:{labels:['Sunny','Rainy','Cloudy'],datasets:[{data:[sunny,rainy,cloudy],backgroundColor:['#f59e0b','#3b82f6','#94a3b8'],borderWidth:0}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:16,font:{size:12},color:'#64748b'}}}}
    });
  }

  // Humidity chart
  if(humChart)humChart.destroy();
  const hc=document.getElementById('humChart');
  if(hc){
    humChart=new Chart(hc,{
      type:'bar',
      data:{labels,datasets:[{label:'Humidity %',data:hums,backgroundColor:hums.map(h=>h>80?'rgba(139,92,246,.7)':'rgba(59,130,246,.5)'),borderRadius:6}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,grid:{color:'rgba(0,0,0,.04)'},ticks:{color:'#64748b',font:{size:11}}},x:{grid:{display:false},ticks:{color:'#64748b',font:{size:11}}}}}
    });
  }
}

// ======= PAGE SWITCH =======
function switchPage(name,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(name+'Page').classList.add('active');
  if(btn)btn.classList.add('active');
  if(name==='trips')renderTrips();
}

// ======= CALENDAR =======
function renderCalendar(){
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calMonthLabel').textContent=months[calMonth]+' '+calYear;
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  document.getElementById('calDays').innerHTML=days.map(d=>`<div class="cal-day-name">${d}</div>`).join('');
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const todayStr=new Date().toISOString().split('T')[0];
  const tripDates=currentTrips.flatMap(t=>{
    const dates=[];let d=new Date(t.start);const e=new Date(t.end);
    while(d<=e){dates.push(d.toISOString().split('T')[0]);d.setDate(d.getDate()+1);}
    return dates;
  });
  let cells='';
  for(let i=0;i<firstDay;i++)cells+=`<div class="cal-cell empty"></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isSel=selectedDates.includes(dateStr);const isToday=dateStr===todayStr;
    const hasTrip=tripDates.includes(dateStr);
    cells+=`<div class="cal-cell${isSel?' selected':''}${isToday?' today':''}${hasTrip?' has-trip':''}" onclick="toggleDate('${dateStr}')">${d}</div>`;
  }
  document.getElementById('calGrid').innerHTML=cells;
  document.getElementById('selectedDatesLabel').textContent=selectedDates.length?selectedDates.join(', '):'None';
}

function prevMonth(){calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCalendar();}
function nextMonth(){calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCalendar();}

function toggleDate(d){
  const idx=selectedDates.indexOf(d);
  if(idx>-1)selectedDates.splice(idx,1);else selectedDates.push(d);
  selectedDates.sort();renderCalendar();
}

// ======= PREDICTION =======
async function getPrediction(){
  if(selectedDates.length===0){showToast('Pick at least one date','📅');return;}
  const city=document.getElementById('predCity').value.trim();
  if(!city){showToast('Enter a city','📍');return;}
  const container=document.getElementById('predResults');
  container.innerHTML='<div class="loading-pulse" style="text-align:center;padding:2rem;color:#64748b">Fetching forecast for '+city+'...</div>';
  try{
    const geoRes=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const geoData=await geoRes.json();
    if(!geoData.results||!geoData.results.length){container.innerHTML='<div class="no-data"><div class="icon">❌</div><p>City not found</p></div>';return;}
    const {latitude,longitude,name}=geoData.results[0];
    const minDate=selectedDates[0];const maxDate=selectedDates[selectedDates.length-1];
    const wRes=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_mean&timezone=auto&start_date=${minDate}&end_date=${maxDate}`);
    const wData=await wRes.json();
    const d=wData.daily;
    const results=selectedDates.map((date,i)=>{
      const di=d.time.indexOf(date);
      if(di===-1)return null;
      const code=d.weathercode[di];const high=Math.round(d.temperature_2m_max[di]);
      const low=Math.round(d.temperature_2m_min[di]);const precip=d.precipitation_probability_mean[di];
      let cond='Cloudy',emoji='☁️';
      if(code<=1){cond='Sunny';emoji='☀️';}
      else if(code<=3){cond='Partly Cloudy';emoji='⛅';}
      else if(code>=51&&code<=82){cond='Rainy';emoji='🌧️';}
      else if(code>=95){cond='Stormy';emoji='⛈️';}
      return{date,high,low,cond,emoji,precip};
    }).filter(Boolean);

    if(results.length===0){container.innerHTML='<div class="no-data"><div class="icon">📅</div><p>No forecast data for selected dates</p></div>';return;}

    container.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;padding:0 .25rem">
        <div style="font-weight:700;color:#0f172a">📍 ${name}</div>
        <button class="trip-btn" onclick="openTripModalFromPrediction('${name}','${selectedDates[0]}','${selectedDates[selectedDates.length-1]}')">Plan Trip ✈️</button>
      </div>
      <div class="pred-result">
        ${results.map(r=>`
          <div class="pred-item">
            <div class="pred-date">${r.date.slice(5)}</div>
            <div class="pred-emoji">${r.emoji}</div>
            <div class="pred-temps">
              <div class="pred-high">${r.high}°C</div>
              <div class="pred-low">Low ${r.low}°C</div>
            </div>
            <div style="text-align:right">
              <div class="pred-cond">${r.cond}</div>
              <div style="font-size:11px;color:#3b82f6;margin-top:2px">💧 ${r.precip}% rain</div>
            </div>
          </div>
        `).join('')}
      </div>`;
  }catch(e){container.innerHTML='<div class="no-data"><div class="icon">⚠️</div><p>Error fetching forecast</p></div>';}
}

// ======= TRIPS =======
const tripColors={Beach:'linear-gradient(135deg,#06b6d4,#0ea5e9)',Mountain:'linear-gradient(135deg,#6366f1,#8b5cf6)',City:'linear-gradient(135deg,#f59e0b,#ef4444)',Adventure:'linear-gradient(135deg,#10b981,#059669)',Cultural:'linear-gradient(135deg,#ec4899,#8b5cf6)',Wildlife:'linear-gradient(135deg,#84cc16,#22c55e)'};
const tripEmojis={Beach:'🏖️',Mountain:'⛰️',City:'🏙️',Adventure:'🧗',Cultural:'🏛️',Wildlife:'🦁'};

function openTripModal(){
  document.getElementById('tripName').value='';document.getElementById('tripDest').value='';
  document.getElementById('tripStart').value='';document.getElementById('tripEnd').value='';
  document.getElementById('tripModal').classList.add('open');
}
function openTripModalFromPrediction(city,start,end){
  switchPage('trips');setTimeout(()=>{
    document.getElementById('tripName').value=city+' Trip';
    document.getElementById('tripDest').value=city;
    document.getElementById('tripStart').value=start;
    document.getElementById('tripEnd').value=end;
    document.getElementById('tripModal').classList.add('open');
  },100);
}
function closeTripModal(){document.getElementById('tripModal').classList.remove('open');}

async function saveTrip(){
  const name=document.getElementById('tripName').value.trim();
  const dest=document.getElementById('tripDest').value.trim();
  const start=document.getElementById('tripStart').value;
  const end=document.getElementById('tripEnd').value;
  const type=document.getElementById('tripType').value;
  const condition=document.getElementById('tripCondition').value;
  if(!name||!dest||!start||!end){showToast('Fill all trip fields','⚠️');return;}
  if(new Date(end)<new Date(start)){showToast('End must be after start','⚠️');return;}
  
  const trip={id:Date.now(),user:currentUser.email,name,dest,start,end,type,condition};
  
  await fetch('/api/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trip)
  });

  await fetchTrips();
  closeTripModal();renderTrips();renderCalendar();showToast('Trip saved! 🎉');
}

async function deleteTrip(id){
  await fetch('/api/trips/' + id, { method: 'DELETE' });
  await fetchTrips();
  renderTrips();renderCalendar();showToast('Trip removed','🗑️');
}

function getDayCount(s,e){return Math.max(1,Math.round((new Date(e)-new Date(s))/(1000*60*60*24))+1);}

function renderTrips(){
  const grid=document.getElementById('tripsGrid');
  if(currentTrips.length===0){
    grid.innerHTML='<div style="grid-column:1/-1" class="no-data"><div class="icon">✈️</div><p>No trips planned yet. Head to the Prediction page to plan your first adventure!</p></div>';
    return;
  }
  grid.innerHTML=currentTrips.map(t=>`
    <div class="trip-card">
      <div class="trip-header" style="background:${tripColors[t.type]||tripColors.City}">
        <span>${tripEmojis[t.type]||'✈️'}</span>
      </div>
      <div class="trip-body">
        <div class="trip-title">${t.name}</div>
        <div class="trip-meta">
          <span>📍 ${t.dest}</span>
          <span>📅 ${t.start} → ${t.end}</span>
          <span>⏱️ ${getDayCount(t.start,t.end)} days</span>
          <span>${getCondEmoji(t.condition)} Expected: ${t.condition}</span>
        </div>
        <div class="trip-tags">
          <span class="trip-tag chip">${t.type}</span>
          <span class="trip-tag" style="background:${t.condition==='Sunny'?'#fef3c7':t.condition==='Rainy'?'#dbeafe':'#f1f5f9'};color:${t.condition==='Sunny'?'#92400e':t.condition==='Rainy'?'#1e40af':'#475569'};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">${getCondEmoji(t.condition)} ${t.condition}</span>
        </div>
        <div class="trip-actions">
          <button class="btn-sm btn-danger" onclick="deleteTrip(${t.id})">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Init
window.addEventListener('load',()=>{
  const today=new Date();calYear=today.getFullYear();calMonth=today.getMonth();
  const saved=localStorage.getItem(CUR_KEY);
  if(saved){try{currentUser=JSON.parse(saved);loadApp();}catch{}}
});
