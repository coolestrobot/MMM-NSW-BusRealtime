	/* global Module */

	/* Magic Mirror
	* Module: MMM-NSW-BusRealtime
	*
	* By
	* MIT Licensed.
	*/

	Module.register("MMM-NSW-BusRealtime", {
		defaults: {
			timeFormat: config.timeFormat,
			maxEntries: 5,
			updateInterval: 60000,
			retryDelay: 5000
		},

		requiresVersion: "2.1.0", // Required version of MagicMirror

		start: function() {
			var self = this;
			var dataRequest = null;
			var dataNotification = null;

			//Flag for check if module is loaded
			//this.loaded = false;
			console.log(this.config.timeFormat);
			this.sendSocketNotification("CONFIG", this.config);

			var data = [];
			data.push("Loading ... ");
			this.dataRequest =  data;
			this.getDom();


			// Schedule update timer.
			//self.sendSocketNotification("GET_DATA"); // first one
			setInterval(function() {
				self.sendSocketNotification("GET_DATA");
			}, this.config.updateInterval);

		},

		getDom: function() {
			var self = this;

			// create element wrapper for show into the module
			var wrapper = document.createElement("div");
			// If this.dataRequest is not empty
			console.log("getDom: ", this.dataRequest);

			var titleWraper = document.createElement("div");
			titleWraper.innerHTML = this.config.title;
			titleWraper.className = "title";
			wrapper.appendChild(titleWraper);

			if (this.dataRequest) {
				this.dataRequest.forEach(function(data, i) {
					var wrapperDataRequest = document.createElement("div");

					wrapperDataRequest.innerHTML = data;
					wrapperDataRequest.className = "small";

					wrapper.appendChild(wrapperDataRequest);
				});

			} else {


			}

			return wrapper;
		},

		getScripts: function() {
			return ["moment.js",
				"modules/MMM-NSW-BusRealtime/node_modules/moment-duration-format/lib/moment-duration-format.js"];
		},

		getStyles: function () {
			return [
				"MMM-NSW-BusRealtime.css",
			];
		},

		processData: function(data) {
			var self = this;
			this.dataRequest = self.processActionNextBus(data);
			console.log(this.dataRequest);
			self.updateDom(self.config.animationSpeed);
		},

		processActionNextBus: function(feed) { 
			
			// A call has just been made and the information comes back to the frontend to be displayed on 
			// the screen here
			// The feed is the raw response from TFNSW in json format
			
			//console.log("processActionNextBus");
			var result = [];

			var departures = JSON.parse(feed);

			//var busStopId = "2122127";
			//result.push("Bus stop: " + busStopId)
			//console.log("Departures: ", departures);
			var allEntities = [];

			if (departures.journeys.length > 0){

				// feed.sort(function(a,b){
				// 	return b.create_time.N - a.create_time.N;
				// });

				// {"M":{"start_time":{"S":"20180616_13:16:00"},"trip_id":{"S":"704600-2439_545-20180616-13:16:00"},
				// "route_id":{"S":"2439_545"},"arrival_time":{"S":"1529121960"},
				// "stop_sequence":{"N":"53"},"lastBusStopId":{"S":"211338"},
				// "vehicle_id":{"S":"NA"},"arrival_delay":{"N":"0"}}

				for (let i = 0; i < departures.journeys.length; i++) {

					
					const journey = departures.journeys[i];

					if (journey.legs.length > 1){
						// Indirect, skip it
						continue;
					}
					
					if (journey.legs[0].transportation.product == '100'){
						continue; // On Foot
					}
					
					// result.journeys[0].legs[0].origin.departureTimeEstimated
					// "2018-10-16T10:21:00Z"
					// result.journeys[0].legs[0].origin.departureTimePlanned
					// "2018-10-16T10:21:00Z"

					var relative = moment(journey.legs[0].origin.departureTimeEstimated);
					try{ 
						var trip = {
							depTimePlanned: journey.legs[0].origin.departureTimePlanned,
							depTimeEstimated: journey.legs[0].origin.departureTimeEstimated,
							originId: journey.legs[0].origin.id,
							originName: journey.legs[0].origin.name,
							number: journey.legs[0].transportation.number,
							fromNow: relative.fromNow(),
							isBefore: relative.isBefore(),
							arrTimePlanned: journey.legs[0].destination.arrivalTimePlanned,
							arrTimeEstimated: journey.legs[0].destination.arrivalTimeEstimated,
							interchanges: journey.interchanges,
							numberOfLegs: journey.legs.length,
							destinationId: journey.legs[0].destination.id,
							destinationName: journey.legs[0].destination.name,
							duration: journey.legs[0].duration,
							transportationDescription: journey.legs[0].transportation.description,
							
							// tripStartDate: element.trip_update.trip.start_date,
							//tripRouteId: element.transportation.number
							// stopSequence: element.stop_sequence.N,
							// arrivalTime:  element.arrival_time.S,
							// arrivalDelay: element.arrival_delay.N
						};
 						if (trip.isBefore){
							continue; // Bus already departed.. no need to display
						}							
						allEntities.push(trip);
		
					} catch (ex){
						console.log("exception:", journey.legs[0]);

					}

				}

				allEntities.sort(function(a,b){
					return moment(a.depTimeEstimated).isAfter(b.depTimeEstimated);
				});
			}


			var currentMs = parseInt((new Date).getTime()/1000);
//			console.log("Current ms: " + currentMs);

			//console.log("All entries: ", allEntities);

			var content = "" // "<div>"+ "Bus stop: " + busStopId +"</div>";
			content += "<table class=\"busTable\">";
			if (allEntities.length == 0){
				content += "<tr><td>No buses available at this time</td></tr>"
			}else{

				var counter = 0;

				for (let i = 0; i < allEntities.length; i++) {
					
					if (counter == this.config.maxEntries) {
						break; // 5 only please
					}
					
					content += "<tr>";
					const trip = allEntities[i];
					if (this.defaults.maxEntries == counter){
						break;
					}
					var dateFormat = "LT"; //"d-MM-YYYY, hh:mm:ss"
					var delayText = "";
					var dueTimeClass = "";
					if (trip.isBefore){
						dueTimeClass = "late";
					} else {
						dueTimeClass = "ontime";
					}

					/* Due in mins */
					content += "<td class=\"dueIn " + dueTimeClass + "\">";
					content += "<div class=\"dueInMins\">" + trip.fromNow + "</div>";
					//content += "<div class=\"busNumber\"> "+ trip.number + "</div>";
					// content += "<div class=\"depPlanned\"> "+ trip.depTimePlanned + "</div>";
					// content += "<div class=\"depEst\"> "+ trip.depTimeEstimated + "</div>";
					//content += "<div class=\"dueInLabel\">mins ";
					// if (delayText.length > 0){
					// 	content += "(" + delayText + ")</div>";
					// }
					//content += "<div class=\"dueInArrivalDelay\">" + trip.arrivalDelay + "</div>";
					content += "</td>";
					/* Arrival Time */
					// content += "<td class=\"arrivalTime\">"+ moment.unix(trip.arrivalTime).format(dateFormat) +"</td>";
					content += "<td class=\"arrivalTime\">"+ moment(trip.depTimeEstimated).format(dateFormat) +"</td>";
					// result.push("<td></td>")
					content += "</tr>";
					counter++;
				}

			}
			content += "</table>";

			// result.push("<br>Last Updated: " + this.formatTimeString(new Date()));
			//var content = "<table><tr><td>1</td><td>2</td><td>2</td></tr><tr><td>1</td><td>2</td><td>2</td></tr></table>"

			content += "<div class='busLastUpdatedLabel'>Last updated: </div><div class='busLastUpdated'>" + this.formatTimeString(new Date()) + "</div>";
			// content += "<div class='poweredBy'>Powered by AWS...</div>";

			result.push(content);


			return result;
		},
		fmtMSS:function(s){
			return(s-(s%=60))/60+(9<s?":":":0")+s
		},
		getArrivalEstimateForDateString: function(dateString, refDate) {
			var d = new Date(dateString);

			var mins = Math.floor((d - refDate) / 60 / 1000);

			return mins + " minute" + ((Math.abs(mins) === 1) ? "" : "s");
		},

		formatTimeString: function(date) {
			var m = moment(date);

			var hourSymbol = "HH";
			var periodSymbol = "";

			if (this.config.timeFormat !== 24) {
				hourSymbol = "h";
				periodSymbol = " A";
			}

			var format = hourSymbol + ":mm" + periodSymbol;

			return m.format(format);
		},

		// socketNotificationReceived from helper
		socketNotificationReceived: function (notification, payload) {
			if (notification === "DATA") {
				this.processData(payload);
			} else if (notification === "ERROR") {
				console.log("ERROR: " +payload);
				this.updateDom(self.config.animationSpeed);
			} else if (notification === "PROCESSING") {
				console.log("Processing received: "  +payload);
				this.handleProcessingText(payload);
				this.updateDom();
			}
		},

		handleProcessingText: function(text){
			var updated = false;
			// for (let i = 0; i < this.dataRequest.length; i++) {
			// 	const row = this.dataRequest[i];
			// if (row.indexOf(text) >= 0) {
			// 	// text = "Call is still in progress "
			// 	var number = parseInt(row.substr(text.length, row.length - text.length));
			// 	number++;
			// 	this.dataRequest[i] = text + number;
			// 	updated = true;
			// 	break;
			// }
			// }
			if (!updated){
				var existing = document.getElementsByClassName("CallInProgressText");
				if (!existing){
					var displayInProressText = "<div class='CallInProgressText'>"+text+"</div>"
					this.dataRequest.push(displayInProressText);
				}
			}
		}
	});
