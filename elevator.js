var elevatorsManager =
{
    outsideQueue: [],  
    elevators: [],      
    init: function(elevators, floors) {
        this.elevators = elevators;
        elevators.forEach(this.hitch(this, function (elevator, elIdx) {

            //********** ACTIVITY OF ELEVATORS **********

            //**** A floor button is pressed by a mob INSIDE the elevator
            elevator.on("floor_button_pressed", this.hitch(this, function (floorNum) {

                //if floor number DONT EXIST in INSIDE-QUEUE of elevator
                var insideIdx = this.indexOfFloorInInsideQueue(elevator, floorNum);
                if (insideIdx === -1) {
                    
                    //--> push floor in INSIDE-QUEUE
                    elevator.goToFloor(floorNum); 
                    
                    //--> clean the OUTSIDE-QUEUE of this floor
                    this.cleanFloorInOutsideQueue(floorNum);                
                }
            }));

            //**** Elevator just stopped at a floor
            elevator.on("stopped_at_floor", this.hitch(this, function(floorNum) {

                //--> clean the OUTSIDE-QUEUE of this floor
                this.cleanFloorInOutsideQueue(floorNum);  
            }));

            //**** Elevator is doing anything because INSIDE-QUEUE is empty, and none is waiting at current floor
            elevator.on("idle", this.hitch(this, function () {
                
                //launch a loop "watching" the OUTSIDE-QUEUE
                var repeat = setInterval(this.hitch(this, function () {    

                    //if OUTSIDE-QUEUE is not empty, go to next OUTSIDE-QUEUE order and stop watching                  
                    if (this.outsideQueue.length > 0) {
                        clearInterval(repeat);
                        this.goToFloorAndCleanQueues(elevator, this.outsideQueue[0].floorNum);
                    } 

                    //if OUTSIDE-QUEUE is empty, but elevator is not in the floor equals to is proper index, go to "it prefered floor"
                    else if (elIdx !== elevator.currentFloor() && elIdx < floors.length) {
                        clearInterval(repeat);
                        this.goToFloorAndCleanQueues(elevator, elIdx);            
                    }
                }), 10);  

            }));   

            //**** Elevator will reach a floor in few milliseconds
            elevator.on("passing_floor", this.hitch(this, function(floorNum, direction) { 

                //check if this floor existe in INSIDE-QUEUE or OUTSIDE-QUEUE               
                var outsideIdx = this.indexOfFloorInOutsideQueue(floorNum);
                var insideIdx = this.indexOfFloorInInsideQueue(elevator, floorNum);

                //if loadFactor is reasonnable (< 3 people in elevator), let's pick more on road people and clean QUEUES
                var loadFactor = elevator.loadFactor();
                if (loadFactor <= 0.725 && (outsideIdx >= 0 || insideIdx >= 0)) {
                    this.cleanFloorInOutsideQueue(floorNum);
                    this.cleanFloorInInsideQueue(elevator, floorNum);  
                    this.unshiftFloorInInsideQueue(elevator, floorNum); 
                }

            }));

        }));
        
        //---- ACTIVITY OF FLOORS
        floors.forEach(this.hitch(this,function (floor) {
            floor.on("down_button_pressed", this.hitch(this, function(flNb) {
                this.addFloorToOutsideQueue(flNb);  
            }, floor.floorNum()));
            floor.on("up_button_pressed", this.hitch(this, function(flNb) {
                this.addFloorToOutsideQueue(flNb);  
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
    indexOfFloorInOutsideQueue: function (floorNum) {        
        var currentIndex = this.some(this.outsideQueue, function (index, floor) {
            var exists = floor.floorNum === floorNum;
            if (exists) {
                return index;
            }     
        });
        return currentIndex;
    }, 
    unshiftFloorInInsideQueue: function (elevator, floorNum) {
        this.cleanFloorInInsideQueue(elevator, floorNum);
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
    indexOfFloorInInsideQueue: function (elevator, floorNum) {        
        var currentIndex = this.some(elevator.destinationQueue, function (index, floorInQueue) {
            var exists = floorInQueue === floorNum;
            if (exists) {
                return index;
            }     
        });
        return currentIndex;
    }, 
    goToFloorAndCleanQueues: function (elevator, floorNum) {        
        this.cleanFloorInOutsideQueue(floorNum); 
        this.cleanFloorInInsideQueue(elevator, floorNum);  
        elevator.goToFloor(floorNum);
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