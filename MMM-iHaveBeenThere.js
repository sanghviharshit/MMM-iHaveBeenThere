/*
 * MagicMirror²
 * Module: MMM-iHaveBeenThere
 *
 * By Sebastian Merkel
 * MIT Licensed.
 */
Module.register("MMM-iHaveBeenThere", {

	// Default module config.
	defaults: {
		title: "My Holidays",
		AnimationEnabled: true,		// enable / disable the plane animation
		pauseDuration: 3.0,				// plane at point time in s
		animationDuration: 10.0,	// plane in air duration in s, raspberry pi A, B, B+ is really slow and lags in the
															// anmation. On Modell 2 & 3 one may set on 2.5s.
		displayDesc: true, 				// display the names of destinations
		zoomLevel: 4.5, 					// central europe
		zoomLongitude: -2, 				// central europe
		zoomLatitude: 46, 				// central europe

		home: {
			latitude: 48.1548256,
			longitude: 11.4017537,
			description: "München"
		},

		trips: [
			{
				latitude: 48.8588377,
				longitude: 2.2775175,
				description: "Paris 1999",
				isConnectedToPrevious: false
			},
			{
				latitude: 51.5285582,
				longitude: -0.2416802,
				description: "London 2005",
				isConnectedToPrevious: false
			},
			{
				latitude: 44.3569914,
				longitude: 24.6273942,
				description: "Bukarest 2010",
				isConnectedToPrevious: false
			},
			{
				latitude: 41.0049822,
				longitude: 28.7319992,
				description: "Istanbul 2010",
				isConnectedToPrevious: true
			}
		],

		colorCountries:				"#BDBDBD",
		colorCountryBorders:	"#000000",
		colorTargetPoints: 		"#FFFFFF",
		colorPlane: 					"#FF0000",
		colorPlaneLine:				"#FFFFFF",
		colorLegendBorder:		"#FFFFFF",
		colorLegendFont:			"#FFFFFF",
		colorTitleFont:				"#FFFFFF"
	},

	// Define required scripts.
	getScripts () {
		return [
		        this.file("node_modules/ammap3/ammap/ammap.js"),
		        this.file("node_modules/ammap3/ammap/maps/js/worldLow.js")
		];
	},

	// Override dom generator.
	getDom () {
		const wrapper = document.createElement("div");

		wrapper.style.width = "100%";
		wrapper.style.height = "700px";
		wrapper.id = "MapDiv";

		return wrapper;
	},

	// function to create the legend and its items
	createLegend () {
		const legend = {
		        fontSize: 13,
		        width: 300,
		        backgroundAlpha: 0.0,
		        borderColor: this.config.colorLegendBorder,
		        borderAlpha: 1,
		        top: 100,
		        left: 15,
		        horizontalGap: 10,
		        useMarkerColorForLabels: true,
		        data: []
		};

		for (const trip of this.config.trips) {
			const LegendItem = {
				title: trip.description,
				markerType: "none",
				color: this.config.colorLegendFont
			};

			legend.data.push(LegendItem);
		}

		return legend;
	},

	// creates the lat coordinates
	createLinesLat () {
		const lat = [];
		for (let i = 0; i < this.config.trips.length; i++) {
			if (this.config.trips[i].isConnectedToPrevious && i > 0) {
				lat.push(this.config.trips[i - 1].latitude);
			} else {
				lat.push(this.config.home.latitude);
			}
			lat.push(this.config.trips[i].latitude);
		}
		return lat;
	},

	// creates the lon coordinates
	createLinesLon () {
		const lon = [];
		for (let i = 0; i < this.config.trips.length; i++) {
			if (this.config.trips[i].isConnectedToPrevious && i > 0) {
				lon.push(this.config.trips[i - 1].longitude);
			} else {
				lon.push(this.config.home.longitude);
			}
			lon.push(this.config.trips[i].longitude);
		}
		return lon;
	},

	// creates all lines of the map
	createLines () {
		const lines = [
		             {
		            	 id: "Plane",
						 arc: -0.85,
						 alpha: 0.3,
						 latitudes: this.createLinesLat(),
						 longitudes: this.createLinesLon()
					 },
					 {
						 id: "GroundShadow",
						 alpha: 0,
						 color: "#000000",
						 latitudes: this.createLinesLat(),
						 longitudes: this.createLinesLon()
					 }
		];
		return lines;
	},

	// creates all images of the map
	createImages () {
		const images = [];
		// add home image
		const home = {
			svgPath: this.targetSVG,
			title: this.config.home.description,
			color: this.config.colorTargetPoints,
			labelColor: this.config.colorTargetPoints,
			latitude: this.config.home.latitude,
			longitude: this.config.home.longitude
		};
		images.push(home);

		// add destination images
		for (const trip of this.config.trips) {
			const dest = {
				svgPath: this.targetSVG,
				title: trip.description,
				color: this.config.colorTargetPoints,
				labelColor: this.config.colorTargetPoints,
				latitude: trip.latitude,
				longitude: trip.longitude
			};
			images.push(dest);
		}

		// plane shadow
		if (this.config.AnimationEnabled === true) {
			const planeShadow = {
		        svgPath: this.planeSVG,
		        positionOnLine: 0,
		        color: this.config.colorPlane,
		        alpha: 0.4,
		        animateAlongLine: true,
		        lineId: "GroundShadow",
		        flipDirection: true,
		        loop: true,
		        scale: 0.03,
		        positionScale: 1.3
	          };
			images.push(planeShadow);

			// plane in the air
		    const plane = {
	    		svgPath: this.planeSVG,
		        positionOnLine: 0,
		        color: this.config.colorPlane,
		        alpha: 0.8,
		        animateAlongLine: true,
		        lineId: "Plane",
		        flipDirection: true,
		        loop: true,
		        scale: 0.03,
		        positionScale: 1.8
		    };
		    images.push(plane);
		}
		return images;
	},

	start () {
		const MyMapPaintDelay_ms	= 100;	// delay for painting the map. 300ms needed for pi b+

		// setting plant and target svg's
		this.targetSVG = "M9,0C4.029,0,0,4.029,0,9s4.029,9,9,9s9-4.029,9-9S13.971,0,9,0z M9,15.93 c-3.83,0-6.93-3.1-6.93-6.93S5.17,2.07,9,2.07s6.93,3.1,6.93,6.93S12.83,15.93,9,15.93 M12.5,9c0,1.933-1.567,3.5-3.5,3.5S5.5,10.933,5.5,9S7.067,5.5,9,5.5 S12.5,7.067,12.5,9z";
		this.planeSVG = "m2,106h28l24,30h72l-44,-133h35l80,132h98c21,0 21,34 0,34l-98,0 -80,134h-35l43,-133h-71l-24,30h-28l15,-47";

		// creating lines
		const MyLines = this.createLines();
		// creating images
		const MyImages	= this.createImages();

		// create map
		const MyMap = AmCharts.makeChart("MapDiv", {
			type: "map",
			handDrawn: true,
	        zoomControl: {
	        	homeButtonEnabled: false,
				panControlEnabled: false,
				zoomControlEnabled: false
			},
			dataProvider: {
				map: "worldLow",
				zoomLevel: this.config.zoomLevel,
				zoomLongitude: this.config.zoomLongitude,
				zoomLatitude: this.config.zoomLatitude,
				lines: MyLines,
				images: MyImages
			},
			areasSettings: {
				unlistedAreasColor: this.config.colorCountries,
				unlistedAreasAlpha: 0.5,
				unlistedAreasOutlineColor: this.config.colorCountryBorders
			},

			imagesSettings: {
				color: this.config.colorTargetPionts,
				selectedColor: "#585869",
				pauseDuration: this.config.pauseDuration,
				animationDuration: this.config.animationDuration,
				adjustAnimationSpeed: false
			},

			linesSettings: {
				color: this.config.colorPlaneLine,
				alpha: 0.4
			}
		}, MyMapPaintDelay_ms);

		// add legend to map
		if (this.config.displayDesc) {
			MyMap.addLegend(this.createLegend());
		}
		// add title
		MyMap.addTitle(this.config.title, 25, this.config.colorTitleFont, 1.0, true);
	}
});