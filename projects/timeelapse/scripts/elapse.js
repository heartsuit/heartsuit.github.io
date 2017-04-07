var WINDOW_WIDTH = 1024;
var WINDOW_HEIGHT = 768;
var RADIUS = 8;
var MARGIN_TOP = 60;
var MARGIN_LEFT = 30;

const startTime = new Date(2010, 3, 9, 21, 52, 1);	// set a time to begin

var curShowTimeSeconds = 0;

var balls = [];
const colors = ["#33B5E5","#0099CC","#AA66CC","#9933CC","#99CC00","#669900","#FFBB33","#FF8800","#FF4444","#CC0000"]

window.onload = function() {
	// screen adaptation
	WINDOW_WIDTH = document.body.clientWidth;
	WINDOW_HEIGHT = document.documentElement.clientHeight;	// for firefox
	MARGIN_LEFT = Math.round(WINDOW_WIDTH / 10);
	MARGIN_TOP = Math.round(WINDOW_HEIGHT / 4);
	RADIUS = Math.round(WINDOW_WIDTH * 4 / 5 / 108) - 1;

	// canvas drawing
	var canvas = document.getElementById("canvas");
	var context = canvas.getContext("2d");
	
	canvas.width = WINDOW_WIDTH;
	canvas.height = WINDOW_HEIGHT;
	
	curShowTimeSeconds = getCurrentShowTimeSeconds();
	
	// animation
	setInterval(
		function() {
			render(context);
			update();
		}
		,
		50
	);
}

function getCurrentShowTimeSeconds() {
	var curTime = new Date();
	
	var seconds = (Date.parse(curTime) - Date.parse(startTime)) / 1000;
	return seconds;
}

function render(cxt) {
	cxt.clearRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);	//avoid redrawing
	
	var elapsedTime = curShowTimeSeconds;
	var days = Math.floor(elapsedTime / (3600 * 24));
	elapsedTime = elapsedTime % (3600 * 24);
	var hours = parseInt(elapsedTime / 3600);
	elapsedTime = elapsedTime % 3600;
	var minutes = parseInt(elapsedTime / 60);
	elapsedTime = elapsedTime % 60;
	var seconds = parseInt(elapsedTime);
	
	cxt.font = "oblique bold 30px MicrosoftYaHei";
//	cxt.lineWidth = 2;
//	cxt.strokeStyle = "#F76";
//	cxt.strokeText("雪妞儿，我们在一起已经度过了", MARGIN_LEFT, MARGIN_TOP - 13*(RADIUS + 1));
//	cxt.fillStyle = "#F4C";
	cxt.fillText("雪妞儿，我们在一起已经度过了:", MARGIN_LEFT, MARGIN_TOP - 13*(RADIUS + 1), 300);
	
	renderDigit(MARGIN_LEFT + 60*(RADIUS+1), MARGIN_TOP - 10*(RADIUS + 1), parseInt(days%10), cxt);
	days = days / 10;
	renderDigit(MARGIN_LEFT + 45*(RADIUS+1), MARGIN_TOP - 10*(RADIUS + 1), parseInt(days%10), cxt);
	days = days / 10;
	renderDigit(MARGIN_LEFT + 30*(RADIUS+1), MARGIN_TOP - 10*(RADIUS + 1), parseInt(days%10), cxt);
	days = days / 10;
	renderDigit(MARGIN_LEFT + (7*2+1)*(RADIUS+1), MARGIN_TOP - 10*(RADIUS + 1), parseInt(days%10), cxt);
	renderDigit(MARGIN_LEFT, MARGIN_TOP - 10*(RADIUS + 1), parseInt(days/10), cxt);
	renderDigit(MARGIN_LEFT + 80*(RADIUS+1), MARGIN_TOP - 10*(RADIUS + 1), 11, cxt);
	
//	renderDigit( MARGIN_LEFT + 75*(RADIUS + 1) , MARGIN_TOP , 10 , cxt ) // :
	
	renderDigit(MARGIN_LEFT, MARGIN_TOP + 14*(RADIUS+1), parseInt(hours/10), cxt);
	renderDigit( MARGIN_LEFT + (7*2+1)*(RADIUS+1) , MARGIN_TOP + 14*(RADIUS+1), parseInt(hours%10) , cxt )
	renderDigit( MARGIN_LEFT + 30*(RADIUS + 1) , MARGIN_TOP + 14*(RADIUS+1) , 10 , cxt ) // :
	renderDigit( MARGIN_LEFT + (30+4*2+1)*(RADIUS+1) , MARGIN_TOP + 14*(RADIUS+1) , parseInt(minutes/10) , cxt);
	renderDigit( MARGIN_LEFT + 54*(RADIUS+1) , MARGIN_TOP + 14*(RADIUS+1) , parseInt(minutes%10) , cxt);
	renderDigit( MARGIN_LEFT + 69*(RADIUS+1) , MARGIN_TOP + 14*(RADIUS+1) , 10 , cxt);
	renderDigit( MARGIN_LEFT + 78*(RADIUS+1) , MARGIN_TOP + 14*(RADIUS+1) , parseInt(seconds/10) , cxt);
	renderDigit( MARGIN_LEFT + 93*(RADIUS+1) , MARGIN_TOP + 14*(RADIUS+1) , parseInt(seconds%10) , cxt);

    // draw the falling balls
    for( var i = 0 ; i < balls.length ; i ++ ){
        cxt.fillStyle=balls[i].color; // fill with different colors

        cxt.beginPath();
        cxt.arc( balls[i].x , balls[i].y , RADIUS , 0 , 2*Math.PI , true );
        cxt.closePath();

        cxt.fill();
    }
}

function renderDigit(x, y, num, cxt) {
	if(num == 11 || num == 10) {
		cxt.fillStyle = "rgb(240, 102, 153)";
	} else {
		cxt.fillStyle = "rgb(0, 102, 153)";
	}
	for(var i = 0; i < digit[num].length; i++) 
		for(var j = 0; j < digit[num][i].length; j++) {
			if(digit[num][i][j] == 1) {
				cxt.beginPath();
				cxt.arc(x + j*2* (RADIUS+1) + (RADIUS+1), y + i*2*(RADIUS+1) + (RADIUS+1), RADIUS, 0, 2*Math.PI);
				cxt.closePath();
				
				cxt.fill();
			}
			
		}
}

function update(){
	var nextShowTimeSeconds = getCurrentShowTimeSeconds();
	
	var nextHours = parseInt(nextShowTimeSeconds / 3600);
	var nextMinutes = parseInt((nextShowTimeSeconds - nextHours*3600) / 60);
	var nextSeconds = parseInt(nextShowTimeSeconds % 60);
	
	var curHours = parseInt(curShowTimeSeconds / 3600);
	var curMinutes = parseInt((curShowTimeSeconds - curHours*3600) / 60);
	var curSeconds = parseInt(curShowTimeSeconds % 60);
	
	if(nextSeconds != curSeconds) {
		// detect the change of every digit
		if( parseInt(curHours/10) != parseInt(nextHours/10) ){
            addBalls( MARGIN_LEFT + 0 , MARGIN_TOP + 14*(RADIUS+1) , parseInt(curHours/10) );
        }
        if( parseInt(curHours%10) != parseInt(nextHours%10) ){
            addBalls( MARGIN_LEFT + 15*(RADIUS+1) , MARGIN_TOP + 14*(RADIUS+1) , parseInt(curHours/10) );
        }

        if( parseInt(curMinutes/10) != parseInt(nextMinutes/10) ){
            addBalls( MARGIN_LEFT + 39*(RADIUS+1) , MARGIN_TOP + 14*(RADIUS+1) , parseInt(curMinutes/10) );
        }
        if( parseInt(curMinutes%10) != parseInt(nextMinutes%10) ){
            addBalls( MARGIN_LEFT + 54*(RADIUS+1) , MARGIN_TOP + 14*(RADIUS+1) , parseInt(curMinutes%10) );
        }

        if( parseInt(curSeconds/10) != parseInt(nextSeconds/10) ){
            addBalls( MARGIN_LEFT + 78*(RADIUS+1) , MARGIN_TOP + 14*(RADIUS+1) , parseInt(curSeconds/10) );
        }
        if( parseInt(curSeconds%10) != parseInt(nextSeconds%10) ){
            addBalls( MARGIN_LEFT + 93*(RADIUS+1) , MARGIN_TOP + 14*(RADIUS+1) , parseInt(nextSeconds%10) );
        }

		curShowTimeSeconds = nextShowTimeSeconds;
		
		console.log(balls.length);
	}
	
	updateBalls();
}

function addBalls( x , y , num ){

    for( var i = 0  ; i < digit[num].length ; i ++ )
        for( var j = 0  ; j < digit[num][i].length ; j ++ )
        	// convert a digit to balls accordingly
            if( digit[num][i][j] == 1 ){
                var aBall = {
                    x:x+j*2*(RADIUS+1)+(RADIUS+1),
                    y:y+i*2*(RADIUS+1)+(RADIUS+1),
                    g:1.5+Math.random(),
                    vx:Math.pow( -1 , Math.ceil( Math.random()*1000 ) ) * 5,	// -5 or +5
                    vy:-10,
                    color: colors[ Math.floor( Math.random()*colors.length ) ]
                }

                balls.push( aBall );
            }
}


function updateBalls(){

    for( var i = 0 ; i < balls.length ; i ++ ){
        balls[i].x += balls[i].vx;
        balls[i].y += balls[i].vy;
        balls[i].vy += balls[i].g;

        // hit test
        if( balls[i].y >= WINDOW_HEIGHT-RADIUS ){
            balls[i].y = WINDOW_HEIGHT-RADIUS;
            balls[i].vy = - balls[i].vy*0.75;	// reduce the v
        }
    }
    
    // pop out the balls have been out of the border 
    var count = 0;
    for(var i = 0; i < balls.length; i++) {
    	// the left and right border
    	if(balls[i].x + RADIUS > 0 && balls[i].x - RADIUS < WINDOW_WIDTH) {
    		balls[count++] = balls[i];
    	}
    }
    
    // the max number of balls inside the canvas is 300  
    while(balls.length > Math.min(300, count)) {
    	balls.pop();
    }
}