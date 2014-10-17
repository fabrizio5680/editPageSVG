(function(a,b){function m(a,b,c){var d=h[b.type]||{},e=c||!b.def;if(a==null){return e?null:b.def}a=d.floor?~~a:parseFloat(a);if(isNaN(a)){return b.def}if(d.mod){return(a+d.mod)%d.mod}return 0>a?0:d.max<a?d.max:a}function n(b){var c=f(),d=c._rgba=[];b=b.toLowerCase();l(e,function(a,e){var f=e.re.exec(b),h=f&&e.parse(f),i,j=e.space||"rgba",k=g[j].cache;if(h){i=c[j](h);c[k]=i[k];d=c._rgba=i._rgba;return false}});if(d.length!==0){if(Math.max.apply(Math,d)===0){a.extend(d,k.transparent)}return c}return k[b]}function o(a,b,c){c=(c+1)%1;if(c*6<1){return a+(b-a)*6*c}if(c*2<1){return b}if(c*3<2){return a+(b-a)*(2/3-c)*6}return a}var c="backgroundColor borderBottomColor borderLeftColor borderRightColor borderTopColor color outlineColor".split(" "),d=/^([\-+])=\s*(\d+\.?\d*)/,e=[{re:/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,parse:function(a){return[a[1],a[2],a[3],a[4]]}},{re:/rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,parse:function(a){return[2.55*a[1],2.55*a[2],2.55*a[3],a[4]]}},{re:/#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/,parse:function(a){return[parseInt(a[1],16),parseInt(a[2],16),parseInt(a[3],16)]}},{re:/#([a-f0-9])([a-f0-9])([a-f0-9])/,parse:function(a){return[parseInt(a[1]+a[1],16),parseInt(a[2]+a[2],16),parseInt(a[3]+a[3],16)]}},{re:/hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,space:"hsla",parse:function(a){return[a[1],a[2]/100,a[3]/100,a[4]]}}],f=a.Color=function(b,c,d,e){return new a.Color.fn.parse(b,c,d,e)},g={rgba:{props:{red:{idx:0,type:"byte"},green:{idx:1,type:"byte"},blue:{idx:2,type:"byte"}}},hsla:{props:{hue:{idx:0,type:"degrees"},saturation:{idx:1,type:"percent"},lightness:{idx:2,type:"percent"}}}},h={"byte":{floor:true,max:255},percent:{max:1},degrees:{mod:360,floor:true}},i=f.support={},j=a("<p>")[0],k,l=a.each;j.style.cssText="background-color:rgba(1,1,1,.5)";i.rgba=j.style.backgroundColor.indexOf("rgba")>-1;l(g,function(a,b){b.cache="_"+a;b.props.alpha={idx:3,type:"percent",def:1}});f.fn=a.extend(f.prototype,{parse:function(c,d,e,h){if(c===b){this._rgba=[null,null,null,null];return this}if(c.jquery||c.nodeType){c=a(c).css(d);d=b}var i=this,j=a.type(c),o=this._rgba=[],p;if(d!==b){c=[c,d,e,h];j="array"}if(j==="string"){return this.parse(n(c)||k._default)}if(j==="array"){l(g.rgba.props,function(a,b){o[b.idx]=m(c[b.idx],b)});return this}if(j==="object"){if(c instanceof f){l(g,function(a,b){if(c[b.cache]){i[b.cache]=c[b.cache].slice()}})}else{l(g,function(a,b){l(b.props,function(a,d){var e=b.cache;if(!i[e]&&b.to){if(c[a]==null||a==="alpha"){return}i[e]=b.to(i._rgba)}i[e][d.idx]=m(c[a],d,true)})})}return this}},is:function(a){var b=f(a),c=true,d=this;l(g,function(a,e){var f=b[e.cache],g;if(f){g=d[e.cache]||e.to&&e.to(d._rgba)||[];l(e.props,function(a,b){if(f[b.idx]!=null){c=f[b.idx]===g[b.idx];return c}})}return c});return c},_space:function(){var a=[],b=this;l(g,function(c,d){if(b[d.cache]){a.push(c)}});return a.pop()},transition:function(a,b){var c=f(a),d=c._space(),e=g[d],i=this.alpha()===0?f("transparent"):this,j=i[e.cache]||e.to(i._rgba),k=j.slice();c=c[e.cache];l(e.props,function(a,d){var e=d.idx,f=j[e],g=c[e],i=h[d.type]||{};if(g===null){return}if(f===null){k[e]=g}else{if(i.mod){if(g-f>i.mod/2){f+=i.mod}else if(f-g>i.mod/2){f-=i.mod}}k[e]=m((g-f)*b+f,d)}});return this[d](k)},blend:function(b){if(this._rgba[3]===1){return this}var c=this._rgba.slice(),d=c.pop(),e=f(b)._rgba;return f(a.map(c,function(a,b){return(1-d)*e[b]+d*a}))},toRgbaString:function(){var b="rgba(",c=a.map(this._rgba,function(a,b){return a==null?b>2?1:0:a});if(c[3]===1){c.pop();b="rgb("}return b+c.join(",")+")"},toHslaString:function(){var b="hsla(",c=a.map(this.hsla(),function(a,b){if(a==null){a=b>2?1:0}if(b&&b<3){a=Math.round(a*100)+"%"}return a});if(c[3]===1){c.pop();b="hsl("}return b+c.join(",")+")"},toHexString:function(b){var c=this._rgba.slice(),d=c.pop();if(b){c.push(~~(d*255))}return"#"+a.map(c,function(a,b){a=(a||0).toString(16);return a.length===1?"0"+a:a}).join("")},toString:function(){return this._rgba[3]===0?"transparent":this.toRgbaString()}});f.fn.parse.prototype=f.fn;g.hsla.to=function(a){if(a[0]==null||a[1]==null||a[2]==null){return[null,null,null,a[3]]}var b=a[0]/255,c=a[1]/255,d=a[2]/255,e=a[3],f=Math.max(b,c,d),g=Math.min(b,c,d),h=f-g,i=f+g,j=i*.5,k,l;if(g===f){k=0}else if(b===f){k=60*(c-d)/h+360}else if(c===f){k=60*(d-b)/h+120}else{k=60*(b-c)/h+240}if(j===0||j===1){l=j}else if(j<=.5){l=h/i}else{l=h/(2-i)}return[Math.round(k)%360,l,j,e==null?1:e]};g.hsla.from=function(a){if(a[0]==null||a[1]==null||a[2]==null){return[null,null,null,a[3]]}var b=a[0]/360,c=a[1],d=a[2],e=a[3],f=d<=.5?d*(1+c):d+c-d*c,g=2*d-f,h,i,j;return[Math.round(o(g,f,b+1/3)*255),Math.round(o(g,f,b)*255),Math.round(o(g,f,b-1/3)*255),e]};l(g,function(c,e){var g=e.props,h=e.cache,i=e.to,j=e.from;f.fn[c]=function(c){if(i&&!this[h]){this[h]=i(this._rgba)}if(c===b){return this[h].slice()}var d=a.type(c),e=d==="array"||d==="object"?c:arguments,k=this[h].slice(),n;l(g,function(a,b){var c=e[d==="object"?a:b.idx];if(c==null){c=k[b.idx]}k[b.idx]=m(c,b)});if(j){n=f(j(k));n[h]=k;return n}else{return f(k)}};l(g,function(b,e){if(f.fn[b]){return}f.fn[b]=function(f){var g=a.type(f),h=b==="alpha"?this._hsla?"hsla":"rgba":c,i=this[h](),j=i[e.idx],k;if(g==="undefined"){return j}if(g==="function"){f=f.call(this,j);g=a.type(f)}if(f==null&&e.empty){return this}if(g==="string"){k=d.exec(f);if(k){f=j+parseFloat(k[2])*(k[1]==="+"?1:-1)}}i[e.idx]=f;return this[h](i)}})});l(c,function(b,c){a.cssHooks[c]={set:function(b,d){var e,g,h;if(a.type(d)!=="string"||(e=n(d))){d=f(e||d);if(!i.rgba&&d._rgba[3]!==1){h=c==="backgroundColor"?b.parentNode:b;do{g=a.css(h,"backgroundColor")}while((g===""||g==="transparent")&&(h=h.parentNode)&&h.style);d=d.blend(g&&g!=="transparent"?g:"_default")}d=d.toRgbaString()}try{b.style[c]=d}catch(d){}}};a.fx.step[c]=function(b){if(!b.colorInit){b.start=f(b.elem,c);b.end=f(b.end);b.colorInit=true}a.cssHooks[c].set(b.elem,b.start.transition(b.end,b.pos))}});k=a.Color.names={aqua:"#00ffff",azure:"#f0ffff",beige:"#f5f5dc",black:"#000000",blue:"#0000ff",brown:"#a52a2a",cyan:"#00ffff",darkblue:"#00008b",darkcyan:"#008b8b",darkgrey:"#a9a9a9",darkgreen:"#006400",darkkhaki:"#bdb76b",darkmagenta:"#8b008b",darkolivegreen:"#556b2f",darkorange:"#ff8c00",darkorchid:"#9932cc",darkred:"#8b0000",darksalmon:"#e9967a",darkviolet:"#9400d3",fuchsia:"#ff00ff",gold:"#ffd700",green:"#008000",indigo:"#4b0082",khaki:"#f0e68c",lightblue:"#add8e6",lightcyan:"#e0ffff",lightgreen:"#90ee90",lightgrey:"#d3d3d3",lightpink:"#ffb6c1",lightyellow:"#ffffe0",lime:"#00ff00",magenta:"#ff00ff",maroon:"#800000",navy:"#000080",olive:"#808000",orange:"#ffa500",pink:"#ffc0cb",purple:"#800080",violet:"#800080",red:"#ff0000",silver:"#c0c0c0",white:"#ffffff",yellow:"#ffff00",transparent:[null,null,null,0],_default:"#ffffff"}}(window.oQuery));