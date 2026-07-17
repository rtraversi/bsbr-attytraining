function ExecuteScript(strId)
{
  switch (strId)
  {
      case "5hMDxMuSpxE":
        Script1();
        break;
      case "5o9xbMsqIEc":
        Script2();
        break;
      case "6evYpDXfmrW":
        Script3();
        break;
      case "6KBIvQtn4BG":
        Script4();
        break;
      case "6TQnxIaZGPv":
        Script5();
        break;
      case "6iX82TXiwHb":
        Script6();
        break;
      case "5sPikbaZ4gJ":
        Script7();
        break;
      case "6TMSOhR9VpW":
        Script8();
        break;
      case "6gZ19K13dgF":
        Script9();
        break;
      case "6SDAKVgvdPr":
        Script10();
        break;
  }
}

window.InitExecuteScripts = function()
{
var player = GetPlayer();
var object = player.object;
var once = player.once;
var addToTimeline = player.addToTimeline;
var setVar = player.SetVar;
var getVar = player.GetVar;
var update = player.update;
var pointerX = player.pointerX;
var pointerY = player.pointerY;
var showPointer = player.showPointer;
var hidePointer = player.hidePointer;
var slideWidth = player.slideWidth;
var slideHeight = player.slideHeight;
var getKeyDown = player.getKeyDown;
var keydown = player.keydown;
var keyup = player.keyup;
window.Script1 = function()
{
  const target = object('5itsY0uHVrz');
const duration = 750;
const easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
const id = '5p8FcDyQwyC';
const growAmount = 1.3;
player.addForTriggers(
id,
target.animate(
player.emphasis.elastic(growAmount)
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script2 = function()
{
  const target = object('5u3Of8tv4nL');
const duration = 100;
const easing = 'ease-out';
const id = '5xo5IFOcZ8B';
const pulseAmount = 0.1;
player.addForTriggers(
id,
target.animate(
[ {scale: '1' }, 
{scale: `${1 + pulseAmount}` }, 
{scale: '1' }, 
{scale: `${1 + pulseAmount}` }, 
{scale: '1' } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script3 = function()
{
  const target = object('5u3Of8tv4nL');
const duration = 100;
const easing = 'ease-out';
const id = '6fwQr06VdWr';
player.addForTriggers(
id,
target.animate(
[ {opacity: 1 }, 
{opacity: 0 }, 
{opacity: 1 }, 
{opacity: 0 }, 
{opacity: 1 } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script4 = function()
{
  const target = object('6DrjeJxsBR5');
const duration = 100;
const easing = 'ease-out';
const id = '6NgXBFtzaet';
const pulseAmount = 0.1;
player.addForTriggers(
id,
target.animate(
[ {scale: '1' }, 
{scale: `${1 + pulseAmount}` }, 
{scale: '1' }, 
{scale: `${1 + pulseAmount}` }, 
{scale: '1' } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script5 = function()
{
  const target = object('6DrjeJxsBR5');
const duration = 100;
const easing = 'ease-out';
const id = '5pUTGbbRbWt';
player.addForTriggers(
id,
target.animate(
[ {opacity: 1 }, 
{opacity: 0 }, 
{opacity: 1 }, 
{opacity: 0 }, 
{opacity: 1 } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script6 = function()
{
  const target = object('64pNgq6YrXV');
const duration = 750;
const easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
const id = '6YnGzdRSWWJ';
const growAmount = 1.3;
player.addForTriggers(
id,
target.animate(
player.emphasis.elastic(growAmount)
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script7 = function()
{
  const target = object('5gFKbNUQgka');
const duration = 750;
const easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
const id = '6GUNN960fPP';
const growAmount = 1.3;
player.addForTriggers(
id,
target.animate(
player.emphasis.elastic(growAmount)
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script8 = function()
{
  const target = object('5s9K7ue6ri0');
const duration = 750;
const easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
const id = '6FV0UNcx8TS';
const growAmount = 1.3;
player.addForTriggers(
id,
target.animate(
player.emphasis.elastic(growAmount)
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script9 = function()
{
  const target = object('6qbqPXA5xfO');
const duration = 500;
const easing = 'ease-out';
const id = '5bqhqBNgNyp';
const pulseAmount = 0.07;
player.addForTriggers(
id,
target.animate(
[ {scale: '1' }, 
{scale: `${1 + pulseAmount}` }, 
{scale: '1' }, 
{scale: `${1 + pulseAmount}` }, 
{scale: '1' } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script10 = function()
{
  const target = object('5jWRnoRHX5C');
const duration = 500;
const easing = 'ease-out';
const id = '6iA2lCr7ZKi';
const pulseAmount = 0.07;
player.addForTriggers(
id,
target.animate(
[ {scale: '1' }, 
{scale: `${1 + pulseAmount}` }, 
{scale: '1' }, 
{scale: `${1 + pulseAmount}` }, 
{scale: '1' } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

};
