/**
 * BrightPath-owned vector illustrations.
 * Lightweight, inline and responsive; no stock child photos or third-party fonts.
 * Every illustration is decorative and has no student-specific content.
 */
export function welcomeArt(theme='parent'){
 const parent=theme==='parent';
 const school=theme==='school';
 const accent=parent?'#ffe6a4':school?'#b7e8f5':'#ffc2a7';
 const backdrop=parent?'#f9deb8':school?'#d1f1e0':'#c8e9f8';
 return '<svg class="bp-friends-svg" aria-hidden="true" viewBox="0 0 360 248" xmlns="http://www.w3.org/2000/svg">'+
 '<ellipse cx="181" cy="217" rx="160" ry="22" fill="#1e6153" opacity=".13"/>'+
 '<path d="M56 54Q35 12 82 14q36 3 33 35M254 35Q290 9 316 42" fill="none" stroke="#fff6d6" stroke-width="6" stroke-linecap="round" opacity=".9"/>'+
 '<path d="M27 154Q13 70 86 48Q181 9 277 41q64 27 60 112Q315 218 180 221 45 226 27 154Z" fill="'+backdrop+'" opacity=".82"/>'+
 '<circle cx="304" cy="61" r="29" fill="#ffde84"/><path d="M300 50q8-7 16-1" fill="none" stroke="#b66a48" stroke-width="3" stroke-linecap="round"/>'+
 '<path d="M47 33l8-11 8 11-8 10Z" fill="#fff4bb"/><path d="M329 112l9-7 6 12-12 5Z" fill="#ffb8c1"/>'+
 '<rect x="18" y="180" width="324" height="21" rx="10" fill="#76caaa" opacity=".72"/>'+
 // kid left, hair and dress
 '<path d="M45 177q3-62 42-65q42 4 46 65" fill="#f7a88f"/>'+
 '<rect x="77" y="113" width="20" height="21" rx="8" fill="#bc7d59"/>'+
 '<circle cx="87" cy="83" r="39" fill="#b77a51"/>'+
 '<path d="M46 81q-1-40 40-42q41 0 41 44q-9-11-11-20-13 11-37 8-14 11-33 10" fill="#34314b"/>'+
 '<circle cx="73" cy="86" r="3.6" fill="#2e2c36"/><circle cx="100" cy="86" r="3.6" fill="#2e2c36"/>'+
 '<path d="M78 102q10 10 21-1" fill="none" stroke="#703f3f" stroke-width="3.8" stroke-linecap="round"/>'+
 '<circle cx="59" cy="96" r="7" fill="#e79483" opacity=".7"/><circle cx="115" cy="96" r="7" fill="#e79483" opacity=".7"/>'+
 '<path d="M61 143L38 169" stroke="#b77a51" stroke-width="13" stroke-linecap="round"/>'+
 '<path d="M118 144l16 25" stroke="#b77a51" stroke-width="13" stroke-linecap="round"/>'+
 // central child with puzzle/block
 '<path d="M126 194q4-73 57-73q51 4 56 73" fill="'+accent+'"/>'+
 '<rect x="171" y="128" width="24" height="19" rx="8" fill="#efb483"/>'+
 '<circle cx="183" cy="98" r="42" fill="#e9aa78"/>'+
 '<path d="M139 93q-9-43 35-49q49-3 55 40-17-12-31-24-11 16-31 13-14 15-28 20" fill="#663f31"/>'+
 '<path d="M147 57q-12-16-4-28q15 5 18 20" fill="#663f31"/>'+
 '<circle cx="168" cy="100" r="3.7" fill="#38313a"/><circle cx="199" cy="100" r="3.7" fill="#38313a"/>'+
 '<path d="M171 115q13 11 25-1" stroke="#934f45" stroke-width="4" stroke-linecap="round" fill="none"/>'+
 '<circle cx="153" cy="109" r="7" fill="#ec938b" opacity=".65"/><circle cx="214" cy="109" r="7" fill="#ec938b" opacity=".65"/>'+
 '<path d="M141 151l-18 28" stroke="#e9aa78" stroke-width="14" stroke-linecap="round"/>'+
 '<path d="M222 153l13 24" stroke="#e9aa78" stroke-width="14" stroke-linecap="round"/>'+
 // teddy / third child 
 '<path d="M239 184q6-64 45-66q48 2 49 66" fill="#a4b5fa"/>'+
 '<rect x="277" y="122" width="18" height="17" rx="8" fill="#d89872"/>'+
 '<circle cx="285" cy="92" r="35" fill="#dc9b71"/>'+
 '<path d="M250 94q-9-37 30-42q35-4 40 34-12-1-15-17-27 17-55 25" fill="#413139"/>'+
 '<circle cx="272" cy="92" r="3.4" fill="#3b3135"/><circle cx="299" cy="92" r="3.4" fill="#3b3135"/>'+
 '<path d="M275 109q10 8 20-1" stroke="#874b47" stroke-width="3.3" fill="none" stroke-linecap="round"/>'+
 '<path d="M249 144l-15 24" stroke="#dc9b71" stroke-width="12" stroke-linecap="round"/>'+
 '<path d="M323 143l14 19" stroke="#dc9b71" stroke-width="12" stroke-linecap="round"/>'+
 '<rect x="153" y="177" width="59" height="43" rx="8" fill="#f9ce5f" stroke="#e6a94b" stroke-width="3"/>'+
 '<text x="181.5" y="207" text-anchor="middle" font-size="25" fill="#935e42" font-weight="900" font-family="sans-serif">ABC</text>'+
 '<rect x="100" y="183" width="34" height="31" rx="5" fill="#a0dcef" stroke="#fff" stroke-width="2"/>'+
 '<rect x="221" y="188" width="33" height="26" rx="6" fill="#ff8d8e"/>'+
 '<path d="M21 119l6-11 6 11-6 9Z" fill="#ffcf74"/>'+
 '</svg>';
}

export function momentArt(kind='play'){
 const base=kind==='nap'?'#e3e9ff':kind==='meal'?'#fff0d8':kind==='pickup'?'#e2f8ee':'#ffebe9';
 const icon={play:'🎨',meal:'🥣',nap:'🌙',pickup:'🧸'}[kind]||'⭐';
 const prop=kind==='meal'
 ?'<path d="M123 148q10 25 44 25 33 0 43-25Z" fill="#ffa871"/><path d="M124 148h84" stroke="#aa655e" stroke-width="5" stroke-linecap="round"/><path d="M198 128v-34" stroke="#73b5ac" stroke-width="6" stroke-linecap="round"/>'
 :kind==='nap'
 ?'<rect x="113" y="135" width="106" height="33" rx="14" fill="#a9bdf2"/><path d="M122 133q47-34 92 0" fill="#c7d6fa"/><path d="M188 60q-23 18 1 40 15 14 31-3-35 6-32-37" fill="#ffca67"/>'
 :kind==='pickup'
 ?'<path d="M123 146l35-14 35 17" fill="none" stroke="#6eb9b3" stroke-width="10" stroke-linecap="round"/><path d="M162 119q-12-23-23 0q0 16 23 33q24-17 24-33q-12-23-24 0Z" fill="#ff9f98"/>'
 :'<rect x="117" y="141" width="30" height="31" rx="5" fill="#ffc875"/><rect x="153" y="132" width="31" height="40" rx="5" fill="#8dddc4"/><rect x="190" y="145" width="27" height="27" rx="5" fill="#a9bdf2"/>';
 return '<svg aria-hidden="true" class="bp-moment-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 194">'+
 '<rect x="1" y="1" width="318" height="192" rx="30" fill="'+base+'"/>'+
 '<circle cx="39" cy="35" r="18" fill="#fff" opacity=".6"/>'+
 '<path d="M274 42l8-13 8 13-8 13Z" fill="#ffcf72"/><path d="M44 144q5-20 23-13" stroke="#8dd9b7" stroke-width="7" fill="none" stroke-linecap="round"/>'+
 '<circle cx="155" cy="79" r="40" fill="#bb805a"/><path d="M118 74q-1-44 37-43q40-1 43 43q-19-13-24-24-16 16-56 24" fill="#4a3441"/>'+
 '<circle cx="141" cy="84" r="3.5" fill="#35333d"/><circle cx="171" cy="84" r="3.5" fill="#35333d"/>'+
 '<path d="M142 98q12 13 25-1" stroke="#864b48" stroke-width="3.3" stroke-linecap="round" fill="none"/>'+
 '<path d="M109 178q3-55 46-56q44 0 49 56" fill="#a3d5fa"/>'+
 prop+'<text x="246" y="155" font-size="36" text-anchor="middle">'+icon+'</text>'+
 '</svg>';
}

export function tinyDoodle(variant=0){
 const things=['✦','🌻','☁','✎','★','♡','🧸','🎈','☀','📚'];
 return things[variant%things.length];
}
