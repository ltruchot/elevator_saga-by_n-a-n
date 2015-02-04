var elevatorsConfig =
{
    outsideQueue: [],  
    elevators: [],      
    init: function(elevators, floors) {
        this.elevators = elevators;
        //var middleFloor = Math.round(floors.length / 2);
        elevators.forEach(this.hitch(this, function (elevator, elIdx) {

            //---- ACTIVITY OF ELEVATORS
            elevator.on("floor_button_pressed", this.hitch(this, function (floorNum) {
                this.goToFloorAndCleanQueue(elevator, floorNum);                
            }));

/*          elevator.on("stopped_at_floor", lthis.hitch(this, function(floorNum) {
                this.cleanFloorInOutsideQueue(floorNum);                
            }));*/
            
            elevator.on("idle", this.hitch(this, function () {
                this.cleanFloorInOutsideQueue(elevator.currentFloor());
/*              elevator.goingUpIndicator(true);
                elevator.goingDownIndicator(true);*/
                //var insideCombinedQueue = this.getInsideCombinedQueue(2);
                var repeat = setInterval(this.hitch(this, function () {                      
                    if (this.outsideQueue.length > 0/* && insideCombinedQueue.indexOf(this.outsideQueue[0].floorNum) === -1*/) {
                        clearInterval(repeat);
                        this.goToFloorAndCleanQueue(elevator, this.outsideQueue[0].floorNum);
                    } 
                    else if (elIdx !== elevator.currentFloor()) {
                        clearInterval(repeat);
                        this.goToFloorAndCleanQueue(elevator, elIdx);            
                    }
                }), 10);  

            }));   

            elevator.on("passing_floor", this.hitch(this, function(floorNum, direction) {                
                var idx = this.indexOfFloorInOutsideQueue(floorNum/*, direction*/);
                var loadFactor = elevator.loadFactor();
                if ((idx >= 0) && (loadFactor <= 0.725)) {
/*                    if (floorNum < elevator.currentFloor()) {
                        elevator.goingUpIndicator(false);
                        elevator.goingDownIndicator(true);
                    }
                    else if (floorNum > elevator.currentFloor()) {
                        elevator.goingUpIndicator(true);
                        elevator.goingDownIndicator(false);
                    }
                    else {
                        elevator.goingUpIndicator(true);
                        elevator.goingDownIndicator(true);
                    }*/
                    this.goToFloorOnRoad(elevator, floorNum);
                }
            }));

        }));
        
        //---- ACTIVITY OF FLOORS
        floors.forEach(this.hitch(this,function (floor) {
            floor.on("down_button_pressed", this.hitch(this, function(flNb) {
                this.addFloorToOutsideQueue(flNb, "down");  
            }, floor.floorNum()));
            floor.on("up_button_pressed", this.hitch(this, function(flNb) {
                this.addFloorToOutsideQueue(flNb, "up");  
            }, floor.floorNum()));
        }));  

    },
    getInsideCombinedQueue: function (instructionNumber) {
        var combinedQueue = [];
        this.elevators.forEach(function (elevator) {
            var cuttedQueue = elevator.destinationQueue;
            if (instructionNumber) {
                cuttedQueue = [];               
                for (i = 0; i < elevator.destinationQueue.length; i++) {
                    if (i < instructionNumber) {
                        cuttedQueue.push(elevator.destinationQueue[i]);
                    } 
                }
            }
            cuttedQueue.forEach(function(val){
                if (combinedQueue.indexOf(val) === -1) {
                    combinedQueue.push(val);
                }
            });
        });
        return combinedQueue;
    }, 
    addFloorToOutsideQueue: function (floorNum, direction) {
        if (this.indexOfFloorInOutsideQueue(floorNum) === -1) {
            this.outsideQueue.push({
                floorNum: floorNum,
                direction: direction
            });        
        }
    },
    cleanFloorInOutsideQueue: function (floorNum) {
        var idx = this.indexOfFloorInOutsideQueue(floorNum);
        if (idx >= 0) {
            this.outsideQueue.splice(idx, 1);
        } 
    },
    indexOfFloorInOutsideQueue: function (floorNum, direction) {        
        return this.some(this.outsideQueue, function (index, floor) {
            var exists = floor.floorNum === floorNum;
            //var found = direction ? exists && floor.direction === direction : exists;
            if (exists) {
                return index;
            }     
        }); 
    }, 
    addFloorToInsideQueue: function (elevator, floorNum) {
        elevator.destinationQueue.unshift(floorNum);
        elevator.checkDestinationQueue(); 
    },
    cleanFloorInInsideQueue: function (elevator, floorNum) {
        elevator.destinationQueue.forEach(function (floorInDestQueue, idx) {
            if (floorInDestQueue === floorNum) {
                elevator.destinationQueue.splice(idx, 1);
            }
        });
        elevator.checkDestinationQueue();
    },
    goToFloorAndCleanQueue: function (elevator, floorNum) {        
        this.cleanFloorInOutsideQueue(floorNum);   
        elevator.goToFloor(floorNum);
    }, 
    goToFloorOnRoad: function (elevator, floorNum) {
        this.cleanFloorInOutsideQueue(floorNum);
        this.cleanFloorInInsideQueue(elevator, floorNum);  
        this.addFloorToInsideQueue(elevator, floorNum);   
    },

    //functionnal helpers
    some: function(arr, test) {
        for (var i = 0; i < arr.length; i++) {
            var trouve = test(i, arr[i]);
            if (typeof trouve !== "undefined") {
                return trouve;
            }
        }
        return -1;
    },
    asArray: function (quasimentUnTableau, debut) {
        var resultat = [];
        for (var i = (debut || 0); i < quasimentUnTableau.length; i++) {
            resultat.push(quasimentUnTableau[i]);
        }
        return resultat;
    },
    
    partial: function (func, context) {
        var argumentsFixes = this.asArray(arguments, 2);
        return function(){
                return func.apply(context || null, argumentsFixes.concat(this.asArray(arguments)));
        };
    },
        
    hitch: function (objet, func) {        
        if (typeof func === "function") {
            if (arguments.length === 2) {
                return function () {
                    func.apply(objet, arguments);
                };
            } else {   
                var partialFunc = this.partial.apply(this, [func, objet].concat(this.asArray(arguments, 2)));
                return function () {
                    partialFunc.apply(objet, arguments);
                };
            }
        }
        return function () {
            objet[func].apply(objet, arguments);
        };
        //}
        /*
        else {
            return this.partial
        }
        */
    },
   
   //unusable native method "update"    
    update: function(dt, elevators, floors) {
       
    }       
    
}
;