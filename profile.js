const data={
achievements:[
 {icon:"◈",name:"FIRST NODE",desc:"Найдена первая игровая точка.",status:"ПОЛУЧЕНО"},
 {icon:"⌁",name:"CODE BREAKER",desc:"Разгадано 10 цифровых кодов.",status:"ПОЛУЧЕНО"},
 {icon:"✦",name:"CITY HUNTER",desc:"Завершите ещё 2 квеста.",status:"3 / 5",locked:false},
 {icon:"◇",name:"NIGHT RUNNER",desc:"Пройти ночной квест.",status:"НЕ ПОЛУЧЕНО",locked:true}
],
routes:[
 {name:"ТАЙНА СТАРОГО ГОРОДА",city:"ЧЕРЕПОВЕЦ",progress:"8 / 8 NODE",time:"01:24:17",status:"ЗАВЕРШЁН"},
 {name:"ПОТЕРЯННЫЙ СЛЕД",city:"ЧЕРЕПОВЕЦ",progress:"5 / 8 NODE",time:"00:57:43",status:"64%"},
 {name:"СЕКРЕТНЫЙ МАРШРУТ",city:"ЧЕРЕПОВЕЦ",progress:"2 / 7 NODE",time:"00:21:09",status:"ПРОДОЛЖИТЬ"}
],
activity:[
 ["Найден NODE 07","+10 XP","сегодня"],
 ["Разгадан цифровой код","+15 XP","сегодня"],
 ["Получено достижение «FIRST NODE»","ACHIEVEMENT","вчера"],
 ["Завершён квест «Потерянный след»","+100 XP","11 авг."]
],
saved:[
 ["ТАЙНА СТАРОГО ГОРОДА","90 МИНУТ","★"],
 ["ЗАБЫТАЯ СТАНЦИЯ","75 МИНУТ","★"],
 ["ПОСЛЕДНИЙ МАРШРУТ","120 МИНУТ","★"]
]};

document.getElementById("achievements").innerHTML=data.achievements.map(a=>`<article class="achievement panel ${a.locked?"locked":""}"><div class="badge">${a.icon}</div><b>${a.name}</b><p>${a.desc}</p><small>${a.status}</small></article>`).join("");
document.getElementById("routes").innerHTML=data.routes.map(r=>`<article class="route-card panel"><div><h3>${r.name}</h3><p>${r.city}</p><div class="route-meta">${r.time} // ${r.status}</div></div><div class="route-progress"><strong>${r.progress}</strong>${r.status==="ПРОДОЛЖИТЬ"?"ПРОДОЛЖИТЬ":"ЗАВЕРШЁН"}</div></article>`).join("");
document.getElementById("activity").innerHTML=data.activity.map(a=>`<div class="activity-item"><i class="activity-dot"></i><div><b>${a[0]}</b><p>${a[1]}</p></div><time>${a[2]}</time></div>`).join("");
document.getElementById("saved").innerHTML=data.saved.map(s=>`<article class="saved-card panel"><span>${s[2]} ${s[1]}</span><h3>${s[0]}</h3><p>Открыть страницу квеста →</p></article>`).join("");
