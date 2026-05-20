class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // PLAYER ---------------------
        this.ACCELERATION = 800;
        this.MAX_SPEED = 200;
        this.DRAG = 1600;
        this.physics.world.gravity.y = 1700;
        this.JUMP_VELOCITY = -400;
        this.PLAYER_SCALE = 0.75;
        this.COYOTE_TIME = 0.08;

        // MISC ---------------------
        this.PARTICLE_VELOCITY = 50;
        this.CAMERA_SCALE = 2.5;
        this.CAMERA_LERP_SPEED = 0.06;
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 999 tiles wide and 999 tiles tall.
        this.map = this.add.tilemap("factory", 18, 18, 999, 999);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.factoryTileset = this.map.addTilesetImage("factory_tileset", "factory_tiles_packed");
        this.rockTileset = this.map.addTilesetImage("rock_tileset", "rock_tiles_packed");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground", [this.factoryTileset, this.rockTileset], 0, 0);
        this.decorLayer = this.map.createLayer("Decor", [this.factoryTileset, this.rockTileset], 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Find collectibles in the "Collectibles" layer in Phaser
        // Look for them by finding objects with the name "collectible"
        // Assign the collectibles texture from the tilemap_sheet sprite sheet
        // Phaser docs:
        // https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Tilemaps.Tilemap-createFromObjects

        this.collectibles = this.map.createFromObjects("Collectibles", {
            name: "collectible",
            key: "wrench",
        });

        //this is so dumb
        for (let collectible of this.collectibles) {
            collectible.y += 576;
        }

        console.log(this.collectibles[0]);

        // Since createFromObjects returns an array of regular Sprites, we need to convert 
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        this.physics.world.enable(this.collectibles, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.collectibles
        // This will be used for collision detection below.
        this.collectibleGroup = this.add.group(this.collectibles);
        
        //console.log(this.collectibleGroup);

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(30, 295, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);
        my.sprite.player.scale = this.PLAYER_SCALE;

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        this.collectiblesVFX = this.add.particles(50, 50, "kenny-particles");
        this.collectiblesVFX.setConfig({
            speed: { min: 50, max: 70},
            scale: { start: 0.2, end: 0.1 },
            alpha: { start: 1, end: 0 },
            lifespan: 200,
            frequency: 0,
            quantity: 2,
            blendMode: 'ADD',
            color: {start: 0xFFFF00, end: 0xFFFF00},
            frame: "star_01.png"
        });
        this.collectiblesVFX.stop();

        // Handle collision detection with collectibles
        this.physics.add.overlap(my.sprite.player, this.collectibleGroup, (obj1, obj2) => {
            this.collectiblesVFX.x = obj2.x;
            this.collectiblesVFX.y = obj2.y;
            this.collectiblesVFX.explode()
            obj2.destroy(); // remove collectible on overlap
        });
        
        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            random: true,
            scale: {start: 0.03, end: 0.1},
            maxAliveParticles: 8,
            lifespan: 350,
            gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.walking.stop();
        
        this.cameras.main.setBounds(0, 0, 10000, 650);
        this.cameras.main.startFollow(my.sprite.player, true, this.CAMERA_LERP_SPEED, this.CAMERA_LERP_SPEED);
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.CAMERA_SCALE);
        
        this.coyoteTimer = 0;
    }

    update(time, delta) {        
        this.coyoteTimer += delta / 1000;

        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);

            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }

        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            
            my.vfx.walking.stop();
        }

        // Clamp x velocity
        my.sprite.player.setVelocityX(Math.max(Math.min(my.sprite.player.body.velocity.x, this.MAX_SPEED), -this.MAX_SPEED));

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if((my.sprite.player.body.blocked.down || this.coyoteTimer < this.COYOTE_TIME) && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }
        if (my.sprite.player.body.blocked.down){
            this.coyoteTimer = 0;
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }

        //Move Collectibles
        for (let collectible of this.collectibles) {
            collectible.y += Math.sin(5 * time / 1000) * (delta / 1000) * 2
        }

    }
}