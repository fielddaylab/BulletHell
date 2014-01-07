var projectileImage = new Image();
projectileImage.src = "static/projectile.png"; // this kills the crab

var enemy1Image = new Image();
enemy1Image.src = "static/enemy_ship_1.gif"

var playerImage = new Image();
playerImage.src = "static/player_ship.png";

var socket = io.connect('72.33.115.223:3000');

function catmullRomInterpolate( P0, P1, P2, P3, u ){
    var u3 = u * u * u;
    var u2 = u * u;
    var f1 = -0.5 * u3 + u2 - 0.5 * u;
    var f2 =  1.5 * u3 - 2.5 * u2 + 1.0;
    var f3 = -1.5 * u3 + 2.0 * u2 + 0.5 * u;
    var f4 =  0.5 * u3 - 0.5 * u2;
    var x = P0.x * f1 + P1.x * f2 + P2.x * f3 + P3.x * f4;
    var y = P0.y * f1 + P1.y * f2 + P2.y * f3 + P3.y * f4;

    return new Point(x, y);
}

function Point(argX, argY){
    this.x = argX;
    this.y = argY;
}

function timeIt(callback){
    var time = performance.now();
    callback();
    return performance.now() - time;
}

function distance(obj1, obj2){
    var x_diff = (obj1.x + obj1.image.width/2) - (obj2.x + obj2.image.width/2);
    var y_diff = (obj1.y + obj1.image.height/2) - (obj2.y + obj2.image.height/2);
    return Math.sqrt(Math.pow(x_diff, 2) + Math.pow(y_diff, 2));
}

var Drawable = function(){
    this.image = new Image();
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.rot_inc = 0;
}
Drawable.prototype = {
    Draw: function(){
        //Game.ctx.fillRect(this.x, this.y, 10, 10);
        if(this.x === null || this.x === 'NaN' || this.y === null || this.y === 'NaN'){
            console.log("Trying to draw something invalid", this);
        }
        this.rotation += this.rot_inc;
        if(this.rotation != 0){
            Game.ctx.save();   
            Game.ctx.translate(this.x + this.image.width/2, this.y + this.image.height/2);
            Game.ctx.rotate(this.rotation * Math.PI / 180); 
            Game.ctx.drawImage(this.image, -this.image.width/2, -this.image.height/2);
            Game.ctx.restore();
        } else {
            Game.ctx.drawImage(this.image, this.x - this.image.width/2, this.y - this.image.height/2);
        }
    }
};

var Projectile = function(argX, argY, argXVel, argYVel){
    this.x = argX;
    this.y = argY;
    this.x_vel = argXVel;
    this.y_vel = argYVel;
    this.image = projectileImage;
    this.rot_inc =  Math.random() * 5 + 10;
}
Projectile.prototype = new Drawable();
Projectile.prototype.constructor = Projectile;
Projectile.prototype.Physics = function(){
    // projectile physics function
    this.y += this.y_vel;
    this.x += this.x_vel;
    if(this.y < -20) return false;
    return true;
}

var EnemyShip = function(){
    this.image = enemy1Image;
    this.behavior = new EnemyBehavior(-50, 300, 850, 0, function(){}, 0, 1, 2500);
};
EnemyShip.prototype = new Drawable();
EnemyShip.prototype.constructor = EnemyShip;
EnemyShip.prototype.Physics = function(){
    var newPoint = this.behavior.Position();
    if(newPoint !== false){
        this.x = newPoint.x;
        this.y = newPoint.y;
    } else {
        return false;
    }

    for(var i = 0; i < Game.projectiles.length; i++){
        var dist = distance(this, Game.projectiles[i]);
        if( dist < 15 ){
            Game.projectiles.splice(i, 1);
            Game.kills++;
            return false;
        }
    }

    return true;
};

var EnemyBehavior = function(startX, startY, endX, endY, pathFunc, startVal, endVal, argDuration){
    this.start = new Point(startX, startY);
    this.end = new Point(endX, endY);
    this.duration = argDuration;
    this.path = {
        func: pathFunc,
        start_val: startVal,
        end_val: endVal
    };
    this.time_started = performance.now();
};
EnemyBehavior.prototype.Position = function(){
    var deltaTime = (performance.now() - this.time_started) / this.duration;
    if(deltaTime > 1){
        return false; // indicate we need to remove ourself from the array of enemies
    }
    var deltaX = (this.end.x - this.start.x) * deltaTime;
    var deltaY = (this.end.y - this.start.y) * deltaTime;
    var newX = this.start.x + deltaX;
    var newY = this.start.y + deltaY;
    return new Point(newX, newY);
};

var PlayerShip = function(argX, argY){
    this.x = argX;
    this.y = argY;
    this.image = playerImage;
}
PlayerShip.prototype = new Drawable();
PlayerShip.prototype.constructor = PlayerShip;
PlayerShip.prototype.Physics = function(){
    this.x = Game.mouse.x;
    this.y = Game.mouse.y;
};

var Node = function(dataVal, prevVal, nextVal){
    this.next = nextVal;
    this.prev = prevVal;
    this.data = dataVal;
};

Node.prototype = {
    toArray: function(){
        var new_array = [];
        var curr_node = this;
        while(curr_node != null){
            new_array.push(curr_node);
            curr_node = curr_node.next;
        }
    }
};

var Game = {
    // public variables
    canvas_tag:             document.getElementById("draw_canvas"),
    ctx:                    document.getElementById("draw_canvas").getContext("2d"),
    physics_timer:          7,
    draw_timer:             15,
    draw_loop_handle:       null,
    physics_loop_handle:    null,
    player:                 null,
    projectiles:            [],
    enemy_projectiles:      [],
    enemies:                [],
    width:                  0,
    height:                 0,
    kills:                  0,
    mouse:{
            x:              null,
            y:              null
    },

    // public functions
    Initialize:     function(){

        // Game.canvas_tag.addEventListener('mousemove', function(evt) {
        //     var rect = Game.canvas_tag.getBoundingClientRect();
        //     Game.mouse.x =  evt.clientX - rect.left;
        //     Game.mouse.y =  evt.clientY - rect.top;
        // }, false);

        // //Touch event here
        // Game.canvas_tag.addEventListener('touchmove', function(evt) {
        //     evt.preventDefault(); //Prevent scrolling, zooming etc for mobile
        //     //var rect = Game.canvas_tag.getBoundingClientRect();
        //     Game.mouse.x =  evt.targetTouches[0].pageX;
        //     Game.mouse.y =  evt.targetTouches[0].pageY;
        // }, false);

        this.width = Game.canvas_tag.width;
        this.height = Game.canvas_tag.height;
        
        this.mouse.x = Math.round(this.width / 2);
        this.mouse.y = Math.round(this.height / 2);

        this.player = new PlayerShip(this.mouse.x, this.mouse.y);

        socket.on('mouse_broadcast', function(mouse_coords){
            Game.mouse.x = mouse_coords.x * Game.width;
            Game.mouse.y = mouse_coords.y * Game.height;
        });

        // initialize game loops

        // TEMP ENEMY ADDING INTERVAL
        setInterval(function(){
            Game.enemies.push(new EnemyShip());
        }, 250);

        setInterval(function(){
           console.log("GAME STATISTICS/////////////////////////");
           console.log("Projectiles: " + Game.projectiles.length);
           console.log("Enemies: " + Game.enemies.length);
           console.log("Kills: " + Game.kills);
        }, 100);

        setInterval(function(){
            Game.projectiles.push(new Projectile(Game.mouse.x-projectileImage.width/2, Game.mouse.y-12-projectileImage.height/2, 0, -5));
        }, 50);

        Game.physics_loop_handle = setInterval(Game.Physics, Game.physics_timer);
        Game.draw_loop_handle = setInterval(Game.Draw, Game.draw_timer);
    },

    Draw:   function(){
        Game.ctx.clearRect(0, 0, Game.width, Game.height);
        for(var i = 0; i < Game.projectiles.length; i++){
            Game.projectiles[i].Draw();
        }
        for(var i = 0; i < Game.enemies.length; i++){
            Game.enemies[i].Draw();
        }
        Game.player.Draw();
    },

    Physics:    function(){
        for(var i = 0; i < Game.projectiles.length; i++){
            if( ! Game.projectiles[i].Physics() ){
                Game.projectiles.splice(i, 1);
                i--;
            }
        }
        for(var i = 0; i < Game.enemies.length; i++){
            if( ! Game.enemies[i].Physics() ){
                Game.enemies.splice(i, 1);
                i--;
            }
        }
        Game.player.Physics();
        
    },

    PrintPoints: function(){
        var curr = Game.points.head;
        Game.ctx.clearRect(0, 0, 800, 600);
        Game.ctx.fillStyle = "rgba(255,255,255,0.05)";
        Game.ctx.fillRect(0,0,1000,800);
        Game.ctx.beginPath();

        for(var pos = 0; pos < Game.points.point_array.length-1 && Game.points.point_array.length > 1; pos++){
            var curr = Game.points.point_array[pos];
            var next = Game.points.point_array[pos+1];

            Game.ctx.strokeStyle = "#000000";
            Game.ctx.moveTo(curr.x * 1000, curr.y * 100 + 400);
            Game.ctx.lineTo(next.x * 1000, next.y * 100 + 400);
        }

        Game.ctx.stroke();
    }

};

Game.canvas_tag.focus();

Game.Initialize(); 



