"use strict";
let MAXSCALE = 100;
let POSITION = {
  x: 102,
  y: 113,
  l: 20
};
let explosiveEmojis = [];
let emoji;
let cnv;
let bubble;

function preload() {
  bubble = loadImage('img/bubble.png');
}

function setup() {
  cnv = createCanvas(375, 145);
  cnv.class('my-canvas');
  imageMode(CENTER);
  // bubble.resize(100, 48);
  let cnvNode = document.querySelector(".my-canvas");
  document.querySelector(".device").appendChild(cnvNode);
  textAlign(CENTER, CENTER);
  textSize(30);
  //emoji = new explosiveEmoji(POSITION.x, POSITION.y, MAXSCALE);
}


function draw() {
  let ctx = cnv.drawingContext;
  ctx.clearRect(0, 0, cnv.width, cnv.height);
  explosiveEmojis.forEach((item, index, arr) => {
    item.run();
    if (item.finishExploded) arr.shift();
  });
  fill('white');
  rect(0, cnv.height, cnv.width, cnv.height);
}
let CLICKCOUNT = 0;

function mousePressed() {
  if (explosiveEmojis.length == 0 || explosiveEmojis[explosiveEmojis.length - 1].exploded) {
    let emoji = new explosiveEmoji(POSITION.x, POSITION.y, MAXSCALE);
    explosiveEmojis.push(emoji);
    CLICKCOUNT = 0;
  }
  CLICKCOUNT++;
  //console.log(CLICKCOUNT);
}

function explosiveEmoji(x, y, maxScale) {
  this.position = createVector(x, y);
  this.changableScale = new changeWithClickObject(1);
  this.scale = 0; //scale of emoji
  this.preState = 0;
  this.explodes = [];
  this.exploded = false;
  this.finishExploded = false;

  this.run = function () {
    this.scale = this.changableScale.addWhenPressed(30);
    if (this.scale >= maxScale && !this.exploded) {
      //console.log(this.scale,maxScale);
      this.exploded = true;
      let explode = new Explode(this.position.x, this.position.y, 30);
      this.explodes.push(explode);
    }
    this.explodes.forEach((item, index, arr) => {
      item.run();
      if (item.isDead) {
        arr.length = 0;
        this.finishExploded = true;
      }
    });
    //draw emoji
    let sprite = '😍'; //'💖', '🥰', '✨', '💗', '🌟', '😍', '🥳', '👏', '👍', '🥳';
    switch (true) {
      case this.scale > 0.7 * maxScale:
        sprite = '😫';
        break;
      case this.scale > 0.33 * maxScale:
        sprite = '😧';
        break;
      case this.scale > 0:
        sprite = '😘';
        break;
      default:
    }

    if (!this.exploded) {
      fill('white');
      let bubbleScale = this.scale * 1.8;

      let offsetX = (0.5 - 1 / 120) * this.scale;
      let offsetY = -(119 / 120 - 0.5) * this.scale;
      let r = min(bubbleScale, maxScale);
      image(bubble, this.position.x + offsetX, this.position.y + offsetY, r, r);
      textSize(this.scale);
      let emojiX = this.position.x;
      let emojiY = this.position.y;
      if (this.scale >= maxScale * 0.7) {
        let jitter = 4;
        emojiX = this.position.x + int(random(-jitter, jitter));
        emojiY = this.position.y + int(random(-jitter, jitter));
      }
      text(sprite, emojiX + offsetX, emojiY + offsetY);
    }
  }

}



function Explode(x, y, n = 30, spreadAngle = [0, TWO_PI]) {
  this.particles = [];
  this.spreadAngle = spreadAngle;
  this.isDead = false;
  for (let i = 0; i < n; i++) {
    let vel = createVector(random(-1, 1), random(-1, 0.5)).normalize().mult(random(1, 1.5)).mult(7);
    let p = new Particle({
      scale: random(10, 40),
      rotation: random(0, Math.PI * 2),
      vel: vel.copy(),
      position: createVector(x, y).add(vel.copy().setMag(MAXSCALE * 0.3)),
      lifeSpan: 300, //random(200, 250),
      damping: 0.985,
      minVel:5,
      bouced: false
    });
    p.preY = p.position.y;
    p.checkBoundaryCollision = function () {
      if ((this.position.x + this.scale / 2) >= cnv.width || (this.position.x - this.scale / 2) <= 0) {
        this.vel.x *= -1;
        this.vel.mult(this.damping);
      }
    }
    p.dropOut = function () {
      if (this.lifeCount < this.lifeSpan * 0.7) {
        if ((this.position.y + this.scale / 2) >= cnv.height && this.preY < this.position.y) {
          this.vel.y *= -1;
          this.vel.mult(this.damping);
        }
      }
      p.preY = p.position.y;
    }
    p.bouceOnceThenOut = function(){
      if (!this.bouced) {
        if ((this.position.y + this.scale / 2) >= cnv.height && this.preY < this.position.y) {
          this.vel.y *= -1;
          this.vel.mult(this.damping);
          this.bouced = true;
        }
      }
      p.preY = p.position.y;
    }
    

    p.customUpdateFunction = function () {
      this.checkBoundaryCollision();
      this.bouceOnceThenOut();
    }
    this.particles.push(p);
  }

  this.run = function () {
    this.particles.forEach((item, index, arr) => {
      item.run();
      // for (let j = 0; j < this.particles.length; j++) {
      //   j == index || item.checkCollision(arr[j]);
      // }
    });
    if (this.particles.every(value => (value.isDead))) this.isDead = true;
  }
}


function changeWithClickObject(startValue) {
  this.preMouseState = false;
  this.start = startValue;
  this.target = this.start;
  this.value = 0;
  this.t = 0;
  this.speed = 0.04;
  this.damping = 0.02; //scale of inc to damp per frame 
  this.shrinkSpeed = 0.004; //scale of inc to shrink per frame when this.value go backward
  this.preValue = this.value;
  this.currState = 0;// >0:  this.value is going forward; -<0: this.value is going backward,
  this.enablePause = false;
  this.preState = this.currState; 
  this.pauseFinished;

  // this.continue = function () {
  //   this.pauseFinished = true;
  //   console.log(this.pauseFinished);
  // }

  this.addWhenPressed = function (inc) {
    if (mouseIsPressed && !this.preMouseState) {
      this.reset(this.value, this.value + inc);
    }
    this.preMouseState = mouseIsPressed;

    this.currState < 0 && (this.shrinkSpeed += 0.01); //when this.value is decreasing，the speed getting faster

    // if (this.currState < 0 && this.preState > 0 && !this.pause) {
    //   this.pause = true;
    //   window.setTimeout(this.continue, 1000);
    // } //pause when this.value is peaked
    // if (!this.pauseFinished && this.enablePause) {
    //   if (this.currState > 0) this.target = abs(this.target - startValue) > 2 * abs(inc / 40) ? this.target - inc / (this.currState >= 0 ? 40 : map(this.backSpeed, 0.5, 1, 40, 20)) : startValue;
    // } else {
    //   this.target = abs(this.target - startValue) > 2 * abs(inc / 40) ? this.target - inc / (this.currState >= 0 ? 40 : map(this.backSpeed, 0.5, 1, 40, 20)) : startValue;
    // }

    this.target = this.target - inc* (this.currState > 0 ? this.damping : this.shrinkSpeed);
    if(inc>0){if(this.target < startValue)this.target = startValue;}
    if(inc<0){if(this.target > startValue)this.target = startValue;}
    this.value = lerp(this.start, this.target, this.t);
    this.currState = inc > 0 ? this.value - this.preValue : this.preValue - this.value; //whether this.value is increasing or decreasing
    this.t < 1 && (this.t += this.speed);
    this.preValue = this.value;
    this.preState = this.currState;
    return this.value
  }
  this.reset = function (a, b) {
    this.start = a;
    this.target = b;
    this.t = 0;
    this.speed = 0.04;
    this.shrinkSpeed = 0.04;
    this.pause = false;
    //this.pauseFinished = false;
  }
}

function qiugengxin(){
    console.log();
}

