function ExecuteScript(strId)
{
  switch (strId)
  {
      case "6iFIW2hgXDM":
        Script1();
        break;
      case "6nxo07OUhbt":
        Script2();
        break;
      case "6dbtdf46aT4":
        Script3();
        break;
      case "6oQ5ba7gRov":
        Script4();
        break;
      case "6ThpM1m5fI6":
        Script5();
        break;
      case "6Dej9mztWWo":
        Script6();
        break;
      case "6SyApOCaBog":
        Script7();
        break;
      case "5fi2EE0ZMwo":
        Script8();
        break;
      case "6Nc4oPdBXxe":
        Script9();
        break;
      case "5ZgrwdFpOGY":
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
  const target = object('6bJnAXdhLlp');
const duration = 750;
const easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
const id = '6oOU9mgn8uX';
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
  const target = object('5ZDDQQE3ONm');
const duration = 100;
const easing = 'ease-out';
const id = '5s6e9lUcBsH';
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
  const target = object('5ZDDQQE3ONm');
const duration = 100;
const easing = 'ease-out';
const id = '6f4AwlcrEUs';
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
  const target = object('6Q5Z4DvWV6P');
const duration = 100;
const easing = 'ease-out';
const id = '5ia5Lit9EBe';
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
  const target = object('6Q5Z4DvWV6P');
const duration = 100;
const easing = 'ease-out';
const id = '6hvzPmSkRQU';
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
  const target = object('5raAKTQJKvG');
const duration = 750;
const easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
const id = '6L2dHH2FN5I';
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
  const target = object('6Ealt0mWmQ3');
const duration = 750;
const easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
const id = '5ol4QtuNsM7';
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
  const target = object('6JkrzTORlZs');
const duration = 750;
const easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
const id = '5txIsTnx5vx';
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
  const target = object('63lfVQpVw64');
const duration = 500;
const easing = 'ease-out';
const id = '6l3Mg6zcfsk';
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
  const target = object('6B7TEjVGCrH');
const duration = 500;
const easing = 'ease-out';
const id = '698sJIjPssL';
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
