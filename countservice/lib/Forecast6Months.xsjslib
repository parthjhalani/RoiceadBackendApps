/*
1. Get tank properties top safety, unpumpable, safety buffer etc
2. Get last executed forecast time from forecast app
3. Get all the delta inventories and save them in Forecast table.
4. Delete all the Forecast entries for Future date from last Inventory Date.
5. Create forecast from last inventory for next 5 days.
6. Adapt tank events based on properties
7. Create replenishment order for Safety buffer hit event

*/
var connectn;
$.hdb.getConnection({}, function(err, client) {
    if (err) {
        // Handle error
        console.error("Error getting HANA DB connection:", err);
        return;
    }
    connectn = client;
    
});

var replOrder = [];

async function getSiteTanksAndExecuteForecast(sites){
	var selectedSites = sites.split(",");
	await deleteForecastedInventoriesAll();
	for(var i=0; i<selectedSites.length; i++){
	  var site = selectedSites[i].trim();
       
	  var tanks = 	await getSiteTankDetails(site);
	  var alltanks = '';
	  for(var j=0 ; j<tanks.length; j++){
	  	if(alltanks !== ''){
	  		alltanks = alltanks + "," ;
	  	}
	  	alltanks = alltanks + tanks[j].TANKNUM ;
	  }
	  executeForecast(site, alltanks);
	}
	await connectn.commit();
	await deleteForecastedInventoriesOlderByAll();
	await connectn.close();
	return "Forecast executed successfully."
}
async function executeForecast(site, tankfilter) {
	var selectedTanks = tankfilter.split(",");
	var sitedetail = await getSiteDetails(site);
	var groupedTanks = await getGroupedTanksWithSFBHit(site, selectedTanks);
	var noOfOrders = 0;
	await deleteFutureOrders(site);
	for (var j = 0; j < groupedTanks.length; j++) {
		if (groupedTanks[j].isSelected) {
			var tanks = groupedTanks[j].Tanks;
			var replOrderDet = [];
			for (var i = 0; i < tanks.length; i++) {
				var tank = tanks[i].TANKNUM;
				var firstTimeForecast = false;
				var lastForecastDateTime;
				var lastForecasted = await getTankLastForecastDetails(site, tank);
				var tankdetails = tanks[i];
				if (lastForecasted === null) {
					lastForecastDateTime = '1990-01-01T00:00:00.000Z';
					firstTimeForecast = true;
				} else {
					lastForecastDateTime = lastForecasted.MODIFIEDAT;
				}
				var deltaInventories = await getDeltaInventories(site, tank, lastForecastDateTime, firstTimeForecast);
				//var orders = getReplenishmentOrders(site,tank);
				if (!(deltaInventories.length === 0 && firstTimeForecast)) {
						if (deltaInventories.length > 0) {
							//getTankDetails(site, tank);
							
							var saveInventories = await saveInventoryInForecastTable(deltaInventories, tankdetails, sitedetail);
							await deleteForecastedInventories(site, tank);
							//noOfOrders = await runForecastForNext5Days(deltaInventories[0], tankdetails, groupedTanks[j]);
							var currInvDate = new Date(deltaInventories[0].MDATE);
							currInvDate = new Date(currInvDate.setHours(deltaInventories[0].MTIME.getHours()));
							var orders = await getReplenishmentOrders(site,tank,currInvDate);
							groupedTanks[j].Tanks[i].Inventory = deltaInventories[0];
							groupedTanks[j].Tanks[i].MQUAN = deltaInventories[0].MQUAN;
							groupedTanks[j].Tanks[i].Inventory.currInvDate = currInvDate;
							groupedTanks[j].Tanks[i].Orders = orders;
							groupedTanks[j].Tanks[i].SITE_SITE = sitedetail[0].SITE;
							groupedTanks[j].Tanks[i].SITE_SITETYPE = sitedetail[0].SITETYPE;
							await saveOldRORD(groupedTanks[j].Tanks[i]);
							//groupedTanks[j].tankdetails = tankdetails;
						} else {
							//Take Forecasted Inventory as CurrTime Inventory and Start forecasting, Delete Older Forecasted Entries
							var inventory = await getForecastedInventoryCurrTime(site, tank);

							if (inventory && inventory !== null) {
								inventory = mapFItoTI(inventory);
								await deleteForecastedInventoriesOlderThanCurrTime(site, tank);
								//noOfOrders = runForecastForNext5Days(inventory, tankdetails, groupedTanks[j]);
								var currInvDate = new Date(inventory.MDATE);
								var orders = await getReplenishmentOrders(site,tank,currInvDate);
								currInvDate = new Date(currInvDate.setHours(inventory.MTIME.getHours()));
								groupedTanks[j].Tanks[i].Inventory = inventory;
								groupedTanks[j].Tanks[i].Inventory.currInvDate = currInvDate;
								groupedTanks[j].Tanks[i].Orders = orders;
								groupedTanks[j].Tanks[i].SITE_SITE = sitedetail[0].SITE;
								groupedTanks[j].Tanks[i].SITE_SITETYPE = sitedetail[0].SITETYPE;
								await saveOldRORD(groupedTanks[j].Tanks[i]);
								//groupedTanks[j].tankdetails = tankdetails;

							}
						}
					} else{
						//create dummy date as no records exists
						// let dummyInv = getDummyInventory(site,tanks[i]);
						// var currInvDate = new Date(dummyInv.MDATE);
						// groupedTanks[j].Tanks[i].Inventory = dummyInv;
						// groupedTanks[j].Tanks[i].Inventory.currInvDate = currInvDate;
						// groupedTanks[j].Tanks[i].MQUAN = 5000;
						// groupedTanks[j].Tanks[i].Orders = [];
						return("No inventory found error");
					}
					await deleteInventoriesOlderThanTenDays(site, tank);
				} //tanks loop ends
				var noOfOrders = await executeForecastSimultaneously(groupedTanks[j]);
			} //ifSelectedEnds
			
			// Create Replenishment Orders
			//createReplenishmentOrder(noOfOrders);
		} //Tankgrp loop ends
		//connectn.commit();
		//connectn.close();

		return true;

	}
	function getDummyInventory(site,tank){
	 let data = 	{
			ID           : 'DUMMY101' ,
	    	SITE         : site,
	        TANKNUM      : tank.TANKNUM, 
	        MDATE        : formatDate(new Date()),
	        MTIME        : formatTime(new Date()),
	        MTYPE        : 'MAN',
	        MTZONE       : 'CET',
	        MATERIALID   : '1000007',
	        MATERIALDESC : 'BENZIN -E10',
	        MFLEVEL      : '',
	        MFUOM        : 'L',
	        MQUAN        : 5000.00,
	        MQUOM        : 'L',
	        Regdate      : formatDate(new Date()),
	        RegTime      : formatTime(new Date()),
	        RegUser      : 'D.Pagonis'
        
		};
		if(tank.MATERIALID){
			data.MATERIALID = tank.MATERIALID;
			data.MATERIALDESC = tank.MATERIALDESC;
		}
		return data;
	}
	/* Order Creation */
	function getReplenishmentOrderNumber() {
		var connectn = $.hdb.getConnection();
		var query = 'SELECT GETORDERNUMBER.NEXTVAL FROM DUMMY';
		var result = connectn.executeQuery(query);
		var order = result[0]['GETORDERNUMBER.NEXTVAL']._val;

		return order;
	}
	async function getReplenishmentOrders(site,tank,date){
		var connectn = await $.hdb.getConnection();
		var orderquery = "SELECT * FROM MY_ROICEAD_REPLENISHMENTORDERS where status='RLSD' and isStatusChgd=false and site_site ='" + site + "' and tanknum='" + tank + "' and suppl_date >='" + formatDate(date) + "'" ;
		var orders = await connectn.executeQuery(orderquery);
		return orders;
	}
	function createReplenishmentOrder(noOfOrders) {
		var conn = $.db.getConnection();
		var so = conn.prepareStatement(
			'INSERT INTO MY_ROICEAD_REPLENISHMENTORDERS VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
		if (noOfOrders > 0) {
			so.setBatchSize(replOrder.length);
			var orders = [];
			for (var k = 0; k < noOfOrders; k++) {
				var sonumber = "A" + getReplenishmentOrderNumber();
				orders.push(sonumber.toString());
			}
			replOrder.sort(function (a, b) {
				return a.orderNumber - b.orderNumber;
			});
			var orderitems = replOrder;
			var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
			var currTstmpResult = connectn.executeQuery(currTimestampQuery);
			var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;
			var x = 1
			var prevOrderNumber = 0;
			for (var i = 0; i < orderitems.length; i++) {
				var itemno = 0;
				if (prevOrderNumber !== orderitems[i].orderNumber) {
					x = 1;
					prevOrderNumber = orderitems[i].orderNumber;
				}
				if (x < 10) {
					itemno = "00" + x * 10;
				} else {
					itemno = "00" + x;
				}

				so.setString(1, orders[(parseInt(orderitems[i].orderNumber) - 1)]); /*ORDERNO <NVARCHAR(15)>*/
				so.setString(2, itemno); /*ITEM <NVARCHAR(6)>*/
				so.setString(3, 'CRT'); /*STATUS <NVARCHAR(4)>*/
				so.setInteger(4, 0); /*ISSTATUSCHGD <BOOLEAN>*/
				so.setString(5, 'ASR'); /*ORDERTYPE <NVARCHAR(3)>*/
				so.setString(6, orderitems[i].TANKNUM); /*TANKNUM <NVARCHAR(10)>*/
				so.setString(7, ''); /*BPTYPE <NVARCHAR(4)>*/
				so.setString(8, ''); /*SUPPL_BP <NVARCHAR(10)>*/
				so.setDecimal(9, orderitems[i].ORDERQTY); /*SUPPL_QTY <DECIMAL>*/
				so.setString(10, 'L'); /*SUPPL_UOM <NVARCHAR(10)>*/

				so.setTimestamp(11, formatDate(orderitems[i].Suppl_Date)); /*11SUPPL_DATE <TIMESTAMP>*/
				so.setTime(12, formatTime(orderitems[i].Suppl_Time), 'HH:MI:SS'); /*12SUPPL_TIME <NVARCHAR(10)>*/
				so.setString(13, 'UTC'); /*SUPPL_TIMEZONE <NVARCHAR(10)>*/
				so.setString(14, '2:00:00'); /*SUPPL_LOW_TOL <NVARCHAR(10)>*/
				so.setString(15, '2:00:00'); /*SUPPL_HIGH_TOL <NVARCHAR(10)>*/
				so.setString(16, ('500')); /*SUPPL_LOW_QTY <NVARCHAR(10)>*/
				so.setString(17, '500'); /*SUPPL_HIGH_QTY <NVARCHAR(10)>*/
				so.setTimestamp(18, calculateCutOffDate(orderitems[i].Cutoff_Date)); /*CUTOFF_DATE <TIMESTAMP>*/
				so.setTime(19, formatTime(orderitems[i].Suppl_Time), 'HH:MI:SS'); /*CUTOFF_TIME <NVARCHAR(10)>*/
				so.setDate(20, formatDate(currTstmp)); /*REGDATE <DATE>*/
				so.setTime(21, formatTime(currTstmp), 'HH:MI:SS'); /*REGTIME <TIME>*/
				so.setString(22, 'D.Pagonis'); /*REGUSER <NVARCHAR(50)>*/
				so.setString(23, orderitems[i].SITE); /*SITE_SITE <NVARCHAR(10)>*/
				so.setString(24, 'FUELS'); /*SITE_SITETYPE <NVARCHAR(5)>*/
				so.setString(25, orderitems[i].MATERIALID); /*SUPPL_MAT_MATERIALID <NVARCHAR(18)>*/
				so.setTimestamp(26, currTstmp); /*CREATEDAT <TIMESTAMP>*/
				so.setString(27, 'D.Pagonis'); /*CREATEDBY <NVARCHAR(255)>*/
				so.setTimestamp(28, currTstmp); /*MODIFIEDAT <TIMESTAMP>*/
				so.setString(29, 'D.Pagonis'); /*MODIFIEDBY <NVARCHAR(255)>*/
				x = x + 1;
				so.addBatch();
			}
			so.executeBatch();
			conn.commit();
			conn.close();
		}
		replOrder = [];

	}

	async function deleteInventoriesOlderThanTenDays(site, tank) {
		var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;
		currTstmp = new Date(currTstmp.setDate(currTstmp.getDate() - 10));
		currTstmp = formatDateTime(currTstmp);
		var delQ = "delete from MY_ROICEAD_DEMANDFORECAST where site_site ='" + site + "' and tank ='" + tank +
			"' and Entry_Type='INV' and ForecastedTimestamp  <='" + currTstmp + "'";
		var deleted = await connectn.executeUpdate(delQ);
		await connectn.commit();
		return true;
	}

async function deleteForecastedInventoriesOlderByAll() {
		//var delQ = "delete from MY_ROICEAD_DEMANDFORECAST where site='" + site + "' and tank ='" + tank + "' and Entry_Type='DMF' and ForecastedTimestamp  >= ( select current_timestamp from dummy) " ;
		var delQ = "delete from MY_ROICEAD_DEMANDFORECAST where ForecastedTimestamp  < ( select current_timestamp from dummy) " ;
		var deleted = await connectn.executeUpdate(delQ);
		await connectn.commit();
		return true;
	}
	async function deleteForecastedInventoriesOlderThanCurrTime(site, tank) {
		//var delQ = "delete from MY_ROICEAD_DEMANDFORECAST where site='" + site + "' and tank ='" + tank + "' and Entry_Type='DMF' and ForecastedTimestamp  >= ( select current_timestamp from dummy) " ;
		var delQ = "delete from MY_ROICEAD_DEMANDFORECAST where site_site ='" + site + "' and tank ='" + tank +
			"' and (Entry_Type='DMF' or Entry_Type='SDMF' or Entry_Type='ORD' or Entry_Type='RORD')";
		var deleted = await connectn.executeUpdate(delQ);
		await connectn.commit();
		return true;
	}

	async function getForecastedInventoryCurrTime(site, tank) {
		var lastForecastQuery = 'SELECT TOP 1 * FROM MY_ROICEAD_DEMANDFORECAST WHERE Site_Site = ' +
			"'" + site + "' and Tank = '" + tank +
			"' and Entry_Type = 'DMF' and ForecastedTimestamp  <= ( select current_timestamp from dummy)  ORDER BY MODIFIEDAT DESC";
		var lastForecastRes = await connectn.executeQuery(lastForecastQuery);
		if (lastForecastRes[0]) {
			return lastForecastRes[0];
		} else {
			return null;
		}
	}
	async	function deleteFutureOrders(site) {
			var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
			var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
			var currTstmp = (currTstmpResult[0].CURRENT_TIMESTAMP);
			currTstmp = new Date(currTstmp.setMinutes(currTstmp.getMinutes() - 3 ));
			var createdAt = formatDateTime(currTstmp);
			var delQ = "delete FROM MY_ROICEAD_REPLENISHMENTORDERS where Site_Site = '" + site + "' and SUPPL_DATE >= (Select current_date from dummy) and STATUS = 'CRT' and isStatusChgd = false and CREATEDAT < '" + createdAt + "'" ;
			var deleted = await connectn.executeUpdate(delQ);
			await connectn.commit();
			return true;
	}
	async function deleteForecastedInventories(site, tank) {
		var delQ = "delete from MY_ROICEAD_DEMANDFORECAST where  (Entry_Type='DMF' or  Entry_Type='SDMF' or Entry_Type='ORD' or Entry_Type='RORD'  ) and site_site ='" +
			site + "' and tank ='" + tank + "'";
		var deleted = await connectn.executeUpdate(delQ);
		await connectn.commit();
		return true;
	}
	async function deleteForecastedInventoriesAll() {
			var delQ = "delete from MY_ROICEAD_DEMANDFORECAST ";
			var deleted = await connectn.executeUpdate(delQ);
			await connectn.commit();
			return true;
	}
    async function deleteForecastedInventoriesBySite(site) {
		var delQ = "delete from MY_ROICEAD_DEMANDFORECAST where site_site ='" + site + "'";
		var deleted = await connectn.executeUpdate(delQ);
		connectn.commit();
		return true;
	}

	async function getTankDetails(site, tank) {
		var getTankDetailsQuery = "SELECT * FROM MY_ROICEAD_TANKS where site = '" + site + "' and tanknum ='" + tank + "'";
		var tankdetails = await connectn.executeQuery(getTankDetailsQuery);
		return tankdetails[0];
	}

	async function getGroupedTanksWithSFBHit(site, seltanks) {
		var tankDetails = await getSiteTankDetails(site);
		var lastInventory = await getTanksWithLatestInventory(site);
		var groupedTanks = [];
		var lastTankGrp = "";
		for (var i = 0; i < tankDetails.length; i++) {
			var isTankGrpFound = false;
			var isSelectedTankGrp = false;

			//Get tank inv details and calculate hours to Hit SFB
			for (var m = 0; m < lastInventory.length; m++) {
				if (lastInventory[m].TANKNUM === tankDetails[i].TANKNUM) {
					tankDetails[i].MQUAN = lastInventory[m].MQUAN;
					tankDetails[i].MQUOM = lastInventory[m].MQUOM;
					tankDetails[i].MATERIALID = lastInventory[m].MaterialId;
					tankDetails[i].MATERIALDESC = lastInventory[m].MaterialDesc;
					tankDetails[i].MDATE = lastInventory[m].MDATE;
					tankDetails[i].MTIME = lastInventory[m].MTIME;

					tankDetails[i].volToReachSFB = parseFloat(parseFloat(tankDetails[i].MQUAN - tankDetails[i].BTMSAF_VOL));
					var hours = tankDetails[i].volToReachSFB / 500;

					tankDetails[i].hoursToReachSFB = parseInt(hours + ((parseInt(hours) + 14) / 15));

					tankDetails[i].volToReachSFBAfterReorder = parseFloat(parseFloat(tankDetails[i].TARLVL_VOL) - tankDetails[i].BTMSAF_VOL);
					var hoursAfterOrder = tankDetails[i].volToReachSFBAfterReorder / 500;

					tankDetails[i].hoursToReachSFBAfterOrder = parseInt(hoursAfterOrder + ((parseInt(hoursAfterOrder) + 14) / 15));
					// var currInvDate = (lastInventory[m].MDATE);
					// currInvDate = new Date(currInvDate.setHours((lastInventory[m].MTIME.getHours() + tankDetails[i].hoursToReachSFB));
					// tankDetails[i].dateTimeToReachSFB = currInvDate;
					var currInvDate = new Date();
					currInvDate = new Date(currInvDate.setHours(currInvDate.getHours() + tankDetails[i].hoursToReachSFB));
					tankDetails[i].dateTimeToReachSFB = currInvDate;
					break;
				}
			}
			//Check if tank blongs to existing prev group and check if its selected by user
			for (var k = 0; k < groupedTanks.length; k++) {
				if (groupedTanks[k].tankGrp === tankDetails[i].TANK_GRP) {
					groupedTanks[k].Tanks.push(tankDetails[i]);
					isTankGrpFound = true;
					isSelectedTankGrp = groupedTanks[k].isSelected;

				}
				if (!isSelectedTankGrp) {
					for (var j = 0; j < seltanks.length; j++) {
						if (seltanks[j] === tankDetails[i].TANKNUM) {
							groupedTanks[k].isSelected = true;
							isSelectedTankGrp = true;
							break;
						}
					}
				}
			} //End of check for existing tank groups

			if (!isTankGrpFound) { // New Tank Group Line Item
				var grpTanks = {
					"tankGrp": tankDetails[i].TANK_GRP,
					"Tanks": [],
					"isSelected": false
				}
				for (var j = 0; j < seltanks.length; j++) {
					if (seltanks[j] === tankDetails[i].TANKNUM) {
						grpTanks.isSelected = true;
						isSelectedTankGrp = true;
						break;
					}
				}
				grpTanks.Tanks.push(tankDetails[i]);
				groupedTanks.push(grpTanks);
			} //End of New Tank Group Line item

		} //tankDetails Loop Ends
		for (var i = 0; i < groupedTanks.length; i++) {

			groupedTanks[i].Tanks.sort(function (a, b) {
				return a.hoursToReachSFB - b.hoursToReachSFB
			});
			groupedTanks[i].minHoursToReachSFB = (groupedTanks[i].Tanks[0].hoursToReachSFB - 2);
			groupedTanks[i].criticalTank = groupedTanks[i].Tanks[0].TANKNUM;

			groupedTanks[i].Tanks.sort(function (a, b) {
				return a.hoursToReachSFBAfterOrder - b.hoursToReachSFBAfterOrder
			});
			groupedTanks[i].minHoursToReachSFBAfterOrder = (groupedTanks[i].Tanks[0].hoursToReachSFBAfterOrder - 2);
			groupedTanks[i].criticalTankAfterOrder = groupedTanks[i].Tanks[0].TANKNUM;
		}
		return groupedTanks;
	}

	// function getReplenishmentOrder() {

	// 	var query = 'SELECT GETORDERNUMBER.NEXTVAL FROM DUMMY';
	// 	var result = connectn.executeQuery(query);
	// 	var count = result[0]['GETORDERNUMBER.NEXTVAL']._val;
	// 	return count;
	// }

	function mapFItoTI(inventory) {
		return {
			"MDATE": inventory.FORECAST_DATE,
			"MTIME": inventory.FORECAST_TIME,
			"MQUAN": inventory.FORECAST_QTY,
			"SITE": inventory.SITE,
			"TANKNUM": inventory.TANK,
			"MATERIALID": inventory.MATERIAL

		}
	}
	async function saveOldRORD(tank){
		var conn = await $.db.getConnection();
		var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;
		

		var orderNumber = 0;
		//st.setBatchSize(10);
		
		for(var k=0; k < tank.Orders.length ; k++ ){
				var st = await conn.prepareStatement('INSERT INTO MY_ROICEAD_DEMANDFORECAST VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
				var order = tank.Orders[k];
				var currInvDate = tank.Inventory.currInvDate;
				var suppl_date = new Date(order.SUPPL_DATE);
				var suppl_time = order.SUPPL_TIME.split(":");
				suppl_date = new Date(suppl_date.setHours(suppl_time[0]));
				if(currInvDate.getDate() >= suppl_date.getDate() && currInvDate.getMonth() >= suppl_date.getMonth() 
						&& currInvDate.getFullYear() >= suppl_date.getFullYear() && currInvDate.getHours() > parseInt(suppl_time[0])  ){
				
					
				st.setTimestamp(1, currTstmp); //crtd at
				st.setString(2, "D.Pagonis"); //crtdby
				st.setTimestamp(3, currTstmp);
				st.setString(4, "D.Pagonis");
				
				st.setString(5, tank.Inventory.TANKNUM);
				st.setDate(6, formatDate(suppl_date)); //ForecastDate
				st.setTime(7, formatTime(suppl_date), 'HH:MI:SS'); //ForecastTinme
				st.setString(8, 'RORD'); //ENTRY_TYPE
				
				st.setString(9, ' '); // Tankgrp
				st.setInteger(10, 0); //0==false, 1 ==true CRITICAL_TANK
				st.setString(11, ''); //PROFILE_DAY
				st.setString(12, ''); //PROFILE_PHD
				st.setString(13, ''); //PROFILE
				st.setString(14, ''); //PROFILE_TYPE
				st.setString(15, ''); // FACTOR
				st.setDecimal(16, parseFloat(order.SUPPL_QTY )); //Forecast Qty
				st.setDecimal(17, order.SUPPL_QTY); //Forecast Inv
				st.setString(18, ''); //FORECAST_EVT
				st.setTimestamp(19, formatDateTime(currInvDate)); //ForecastedDateTime
                st.setString(20, getMonthName(currInvDate)); //Forecast_Month
                st.setString(21, tank.Inventory.MATERIALID); //MATERIAL
                st.setString(22, tank.SITE_SITE);
                st.setString(23, tank.SITE_SITETYPE);
                st.setString(24, tank.VOLUOM);
				//st.addBatch();
				await st.executeUpdate();
				await conn.commit();
					
					
				}
		}
				await conn.close();
		
	}
	function calculateCutOffDate(date) {
		var cutoffdate = new Date(date.setDate(date.getDate() - 1));
		return formatDate(cutoffdate);
	}
	async function executeForecastSimultaneously(groupedTanks){
		var conn = await $.db.getConnection();
		var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;
		var st = await conn.prepareStatement('INSERT INTO MY_ROICEAD_DEMANDFORECAST VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

		var orderNumber = 0;
		st.setBatchSize(1000000 );
		var currDate = new Date(currTstmpResult[0].CURRENT_TIMESTAMP); 
		var forecastLastDate= new Date();
		
		forecastLastDate = forecastLastDate.setDate(forecastLastDate.getDate() + 183);
		//var forecastLoop = hoursDiff + 120;
		//var volToHitSFB = tankGrp.minHoursToReachSFB;
		//var criticalTank = tankGrp.criticalTank;
		var hitSFBInPrevLoop = false;
		var stopForecast = false;
		var x = 0;
		//var hoursDiff = Math.abs(currDate.getTime() - currInvDate.getTime()) / 3600000;
		
		while(!stopForecast){
			var entry_type = 'DMF';
			var forecast_event = '';
			var critical_tank = 0;
			for(var i=0; i<groupedTanks.Tanks.length; i++){
				var tankdetails = groupedTanks.Tanks[i];
				var inventory = groupedTanks.Tanks[i].Inventory;
			if (hitSFBInPrevLoop === x) {
				var orderdetails = {};
				var curInvDateT = new Date(groupedTanks.Tanks[i].Inventory.currInvDate.setHours(groupedTanks.Tanks[i].Inventory.currInvDate.getHours() ));
				orderdetails = {
					"SITE": groupedTanks.Tanks[i].Inventory.SITE,
					"TANKNUM": groupedTanks.Tanks[i].Inventory.TANKNUM,
					"ORDERQTY": (parseFloat(tankdetails.TARLVL_VOL) - (tankdetails.MQUAN  )  ),
					"Suppl_Date": curInvDateT,//groupedTanks.Tanks[i].Inventory.currInvDate,
					"Suppl_Time": curInvDateT,
					"Cutoff_Date": curInvDateT, //calculateCutOffDate
					"orderNumber": orderNumber,
					"MATERIALID": tankdetails.MATERIALID,
					"MATERIALDESC": tankdetails.MATERIALDESC

				}
				if (formatDate(groupedTanks.Tanks[i].Inventory.currInvDate) >= formatDate(currTstmp) && orderNumber !== 0) {
					replOrder.push(orderdetails);
					//orderNumber = orderNumber + 1;
				}
				tankdetails.MQUAN = tankdetails.MQUAN + orderdetails.ORDERQTY ;
				
				st.setTimestamp(1, currTstmp); //crtd at
				st.setString(2, "D.Pagonis"); //crtdby
				st.setTimestamp(3, currTstmp);
				st.setString(4, "D.Pagonis");
				//st.setString(5, groupedTanks.Tanks[i].Inventory.SITE);
				st.setString(5, groupedTanks.Tanks[i].Inventory.TANKNUM);
				st.setDate(6, formatDate(curInvDateT)); //ForecastDate
				st.setTime(7, formatTime(curInvDateT), 'HH:MI:SS'); //ForecastTinme
				st.setString(8, 'ORD'); //ENTRY_TYPE
				
				
				st.setString(9, ' '); // Tankgrp
				st.setInteger(10, 0); //0==false, 1 ==true CRITICAL_TANK
				st.setString(11, ''); //PROFILE_DAY
				st.setString(12, ''); //PROFILE_PHD
				st.setString(13, ''); //PROFILE
				st.setString(14, ''); //PROFILE_TYPE
				st.setString(15, ''); // FACTOR
				
				st.setDecimal(16, parseFloat(orderdetails.ORDERQTY)); //Forecast Qty
				st.setDecimal(17, tankdetails.MQUAN); //Forecast Inv
				st.setString(18, forecast_event); //FORECAST_EVT
				st.setTimestamp(19, formatDateTime(curInvDateT)); //ForecastedDateTime
                st.setString(20, getMonthName(curInvDateT)); //Forecast_Month
                st.setString(21, groupedTanks.Tanks[i].MATERIALID); //MATERIAL
                st.setString(22,groupedTanks.Tanks[i].SITE_SITE);
                st.setString(23, groupedTanks.Tanks[i].SITE_SITETYPE);
                st.setString(24, groupedTanks.Tanks[i].VOLUOM);
				st.addBatch();

			}
			groupedTanks.Tanks[i].Inventory.currInvDate = new Date(groupedTanks.Tanks[i].Inventory.currInvDate.setHours(groupedTanks.Tanks[i].Inventory.currInvDate.getHours() + 1));
			//Check for Released Orders and add the QTY to MQUAN, Also add entry to forecast table
			for(var k=0; k < groupedTanks.Tanks[i].Orders.length ; k++ ){
				var order = groupedTanks.Tanks[i].Orders[k];
				var currInvDate = groupedTanks.Tanks[i].Inventory.currInvDate;
				var suppl_date = new Date(order.SUPPL_DATE);
				var suppl_time = order.SUPPL_TIME.split(":");
					
				suppl_date = new Date(suppl_date.setHours(suppl_time[0]));
				if(currInvDate.getDate() === suppl_date.getDate() && currInvDate.getMonth() === suppl_date.getMonth() 
						&& currInvDate.getFullYear() === suppl_date.getFullYear() && currInvDate.getHours() === suppl_date.getHours()  ){
				
					tankdetails.MQUAN = tankdetails.MQUAN + parseFloat(order.SUPPL_QTY );
					st.setTimestamp(1, currTstmp); //crtd at
				st.setString(2, "D.Pagonis"); //crtdby
				st.setTimestamp(3, currTstmp);
				st.setString(4, "D.Pagonis");
				
				st.setString(5, groupedTanks.Tanks[i].Inventory.TANKNUM);
				st.setDate(6, formatDate(currInvDate)); //ForecastDate
				st.setTime(7, formatTime(currInvDate), 'HH:MI:SS'); //ForecastTinme
				st.setString(8, 'RORD'); //ENTRY_TYPE
				
				st.setString(9, ' '); // Tankgrp
				st.setInteger(10, critical_tank); //0==false, 1 ==true CRITICAL_TANK
				st.setString(11, ''); //PROFILE_DAY
				st.setString(12, ''); //PROFILE_PHD
				st.setString(13, ''); //PROFILE
				st.setString(14, ''); //PROFILE_TYPE
				st.setString(15, ''); // FACTOR
				st.setDecimal(16, parseFloat(order.SUPPL_QTY )); //Forecast Qty
				st.setDecimal(17, tankdetails.MQUAN); //Forecast Inv
				st.setString(18, forecast_event); //FORECAST_EVT
				st.setTimestamp(19, formatDateTime(currInvDate)); //ForecastedDateTime
                st.setString(20, getMonthName(currInvDate)); //Forecast_Month
                st.setString(21, groupedTanks.Tanks[i].MATERIALID); //MATERIAL
                st.setString(22,groupedTanks.Tanks[i].SITE_SITE);
                st.setString(23, groupedTanks.Tanks[i].SITE_SITETYPE);
                st.setString(24, groupedTanks.Tanks[i].VOLUOM);
				st.addBatch();

					break;
				}
			}// Released Order loop end
			if (tankdetails.MQUAN <= parseFloat(tankdetails.BTMSAF_VOL)) {
				
				critical_tank = 1;
				hitSFBInPrevLoop = x + 1;
				if (formatDate(groupedTanks.Tanks[i].Inventory.currInvDate) >= formatDate(currTstmp)) {
					
					orderNumber = orderNumber + 1;
				}
				

			}

			if (tankdetails.MQUAN <= parseFloat(tankdetails.BTMSAF_VOL)) {
				forecast_event = 'SFB';
			}
			if (x === 0) {
				entry_type = 'SDMF';
				//
			}
			
			if ((currDate.getTime() <  groupedTanks.Tanks[i].Inventory.currInvDate.getTime()) || x === 0) {
				st.setTimestamp(1, currTstmp); //crtd at
				st.setString(2, "D.Pagonis"); //crtdby
				st.setTimestamp(3, currTstmp);
				st.setString(4, "D.Pagonis");
				
				st.setString(5, groupedTanks.Tanks[i].Inventory.TANKNUM);
				st.setDate(6, formatDate(groupedTanks.Tanks[i].Inventory.currInvDate)); //ForecastDate
				st.setTime(7, formatTime(groupedTanks.Tanks[i].Inventory.currInvDate), 'HH:MI:SS'); //ForecastTinme
				st.setString(8, entry_type); //ENTRY_TYPE
				
				st.setString(9, ' '); // Tankgrp
				st.setInteger(10, critical_tank); //0==false, 1 ==true CRITICAL_TANK
				st.setString(11, ''); //PROFILE_DAY
				st.setString(12, ''); //PROFILE_PHD
				st.setString(13, ''); //PROFILE
				st.setString(14, ''); //PROFILE_TYPE
				st.setString(15, ''); // FACTOR
				st.setDecimal(16, 0.0); //Forecast Qty
				st.setDecimal(17, tankdetails.MQUAN); //Forecast Inv
				st.setString(18, forecast_event); //FORECAST_EVT
				st.setTimestamp(19, formatDateTime(groupedTanks.Tanks[i].Inventory.currInvDate)); //ForecastedDateTime
                st.setString(20, getMonthName(groupedTanks.Tanks[i].Inventory.currInvDate)); //Forecast_Month
                st.setString(21, groupedTanks.Tanks[i].MATERIALID); //MATERIAL
                st.setString(22,groupedTanks.Tanks[i].SITE_SITE);
                st.setString(23, groupedTanks.Tanks[i].SITE_SITETYPE);
                st.setString(24, groupedTanks.Tanks[i].VOLUOM);
				st.addBatch();

			}
			tankdetails.MQUAN = tankdetails.MQUAN - 500;
			}//tankloop
			if(groupedTanks.Tanks[0].Inventory.currInvDate >= forecastLastDate){
				stopForecast = true;
			}
			x = x + 1;
		}//while loop
			await st.executeBatch();
		await conn.commit();
		await conn.close();

		return (orderNumber );
	}
	async function runForecastForNext5Days(inventory, tankdetails, tankGrp) {
		// var currInvDate = (inventory.MDATE);
		// currInvDate = new Date(currInvDate.setHours(inventory.MTIME.getHours()));
		// //currInvDate = currInvDate.setMinutes(inventory.MTIME.getMinutes());
		var mquan = parseFloat(tankdetails.MQUAN);
		var conn = await $.db.getConnection();
		var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;
		var st = await conn.prepareStatement('INSERT INTO MY_ROICEAD_DEMANDFORECAST VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

		var orderNumber = 0;
		st.setBatchSize(135);
		var currDate = new Date(currTstmpResult[0].CURRENT_TIMESTAMP);
		var currInvDate = new Date(inventory.MDATE);
		currInvDate = new Date(currInvDate.setHours(inventory.MTIME.getHours()));
		//currInvDate = new Date(currInvDate.setMinutes(inventory.MTIME.getMinutes()));
		var hoursDiff = Math.abs(currDate.getTime() - currInvDate.getTime()) / 3600000;
		var forecastLoop = hoursDiff + 120;
		var volToHitSFB = tankGrp.minHoursToReachSFB;
		var criticalTank = tankGrp.criticalTank;
		var hitSFBInPrevLoop = false;
		for (var x = 0; x < forecastLoop; x++) {
			var entry_type = 'DMF';
			var forecast_event = '';
			var critical_tank = 0;
			if (hitSFBInPrevLoop) {
				mquan = mquan + orderdetails.ORDERQTY + 500;
				hitSFBInPrevLoop = false;
				st.setTimestamp(1, currTstmp); //crtd at
				st.setString(2, "D.Pagonis"); //crtdby
				st.setTimestamp(3, currTstmp);
				st.setString(4, "D.Pagonis");
				
				st.setString(5, inventory.TANKNUM);
				st.setDate(6, formatDate(currInvDate)); //ForecastDate
				st.setTime(7, formatTime(currInvDate), 'HH:MI:SS'); //ForecastTinme
				st.setString(8, 'ORD'); //ENTRY_TYPE
				
				st.setString(9, ' '); // Tankgrp
				st.setInteger(10, critical_tank); //0==false, 1 ==true CRITICAL_TANK
				st.setString(11, ''); //PROFILE_DAY
				st.setString(12, ''); //PROFILE_PHD
				st.setString(13, ''); //PROFILE
				st.setString(14, ''); //PROFILE_TYPE
				st.setString(15, ''); // FACTOR
				st.setDecimal(16, parseFloat(orderdetails.ORDERQTY)); //Forecast Qty
				st.setDecimal(17, mquan); //Forecast Inv
				st.setString(18, forecast_event); //FORECAST_EVT
				st.setTimestamp(19, formatDateTime(currInvDate)); //ForecastedDateTime
                st.setString(20, getMonthName(currInvDate)); //Forecast_Month
                st.setString(21, inventory.MATERIALID); //MATERIAL
                st.setString(22,inventory.SITE_SITE);
                st.setString(23, inventory.SITE_SITETYPE);
                st.setString(24, inventory.MFUOM);
				st.addBatch();

			}
			if ((x) === volToHitSFB) {
				var orderdetails = {};
				orderdetails = {
					"SITE": inventory.SITE,
					"TANKNUM": inventory.TANKNUM,
					"ORDERQTY": (parseFloat(tankdetails.TARLVL_VOL) - mquan),
					"Suppl_Date": currInvDate,
					"Suppl_Time": (currInvDate),
					"Cutoff_Date": (currInvDate), //calculateCutOffDate
					"orderNumber": orderNumber,
					"MATERIALID": tankdetails.MATERIALID,
					"MATERIALDESC": tankdetails.MATERIALDESC

				}

				if (inventory.TANKNUM === criticalTank) {
					critical_tank = 1;
				}
				//if(volToHitSFB === tankGrp.minHoursToReachSFB){
				volToHitSFB = volToHitSFB + tankGrp.minHoursToReachSFBAfterOrder;
				criticalTank = tankGrp.criticalTankAfterOrder;
				hitSFBInPrevLoop = true;
				if (formatDate(currInvDate) >= formatDate(currTstmp)) {
					replOrder.push(orderdetails);
					orderNumber = orderNumber + 1;
				}
				//}

			}

			if (mquan <= parseFloat(tankdetails.BTMSAF_VOL)) {
				forecast_event = 'SFB';
			}
			if (x === 0) {
				entry_type = 'SDMF';
				//
			}
			currInvDate = new Date(currInvDate.setHours(currInvDate.getHours() + 1));
			if (!(x < hoursDiff) || x === 0) {
				st.setTimestamp(1, currTstmp); //crtd at
				st.setString(2, "D.Pagonis"); //crtdby
				st.setTimestamp(3, currTstmp);
				st.setString(4, "D.Pagonis");
			
				st.setString(5, inventory.TANKNUM);
				st.setDate(6, formatDate(currInvDate)); //ForecastDate
				st.setTime(7, formatTime(currInvDate), 'HH:MI:SS'); //ForecastTinme
				st.setString(8, entry_type); //ENTRY_TYPE
				
				st.setString(9, ' '); // Tankgrp
				st.setInteger(10, critical_tank); //0==false, 1 ==true CRITICAL_TANK
				st.setString(11, ''); //PROFILE_DAY
				st.setString(12, ''); //PROFILE_PHD
				st.setString(13, ''); //PROFILE
				st.setString(14, ''); //PROFILE_TYPE
				st.setString(15, ''); // FACTOR
				st.setDecimal(16, 0.0); //Forecast Qty
				st.setDecimal(17, mquan); //Forecast Inv
				st.setString(18, forecast_event); //FORECAST_EVT
				st.setTimestamp(19, formatDateTime(currInvDate)); //ForecastedDateTime
                st.setString(20, getMonthName(currInvDate)); //Forecast_Month
                st.setString(21, inventory.MATERIALID); //MATERIAL
                st.setString(22,inventory.SITE_SITE);
                st.setString(23, inventory.SITE_SITETYPE);
                st.setString(24, inventory.MFUOM);
				st.addBatch();

			}
			mquan = mquan - 500;

		}

		await st.executeBatch();
		await conn.commit();
		await conn.close();

		return (orderNumber + 1);
	}

	async function saveInventoryInForecastTable(inventories, tankdetails,sitedetails) {
		var conn = await $.db.getConnection();
		var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;
		var st = await conn.prepareStatement('INSERT INTO MY_ROICEAD_DEMANDFORECAST VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
		var entry_type = 'INV';
		st.setBatchSize(inventories.length);
		tankdetails.TANK_GRP = ' ';
		for (var x = 0; x < inventories.length; x++) {
			var currInvDate = (inventories[x].MDATE);
			currInvDate = new Date(currInvDate.setHours(inventories[x].MTIME.getHours()));
			currInvDate = new Date(currInvDate.setMinutes(inventories[x].MTIME.getMinutes()));
			st.setTimestamp(1, currTstmp); //crtd at
			st.setString(2, "D.Pagonis"); //crtdby
			st.setTimestamp(3, currTstmp);
			st.setString(4, "D.Pagonis");
			
			st.setString(5, inventories[x].TANKNUM);
			st.setDate(6, inventories[x].MDATE);
			st.setTime(7, inventories[x].MTIME);
			st.setString(8, entry_type); //ENTRY_TYPE
			
			st.setString(9, tankdetails.TANK_GRP); // Tankgrp
			st.setInteger(10, 0); //0==false, 1 ==true CRITICAL_TANK
			st.setString(11, ''); //PROFILE_DAY
			st.setString(12, ''); //PROFILE_PHD
			st.setString(13, ''); //PROFILE
			st.setString(14, ''); //PROFILE_TYPE
			st.setString(15, ''); // FACTOR
			st.setDecimal(16, 0.0); //Forecast Qty
			st.setDecimal(17, inventories[x].MQUAN); //Forecast Inv
			st.setString(18, ''); //FORECAST_EVT
			st.setTimestamp(19, formatDateTime(currInvDate)); //ForecastedDateTime
            st.setString(20, getMonthName(currInvDate)); //Forecast_Month
            st.setString(21, inventories[x].MATERIALID); //MATERIAL
            st.setString(22,sitedetails[0].SITE);
            st.setString(23, sitedetails[0].SITETYPE);
            st.setString(24, tankdetails.VOLUOM);
			st.addBatch();

		}

		await st.executeBatch();
		await conn.commit();
		await conn.close();
	}
	async function getSiteDetails(site){
		var getSiteDetQ = `select * from MY_ROICEAD_SITEDETAILS where site = '${site}'`;
		var sites = await connectn.executeQuery(getSiteDetQ);
		return sites;
	}
	async function getDeltaInventories(site, tank, lastForecastDateTime, firstTimeForecast) {
		var getInventoriesQuery;
		var currTimestampQuery = 'SELECT CURRENT_DATE  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_DATE;
		currTstmp = new Date(currTstmp.setDate(currTstmp.getDate() - 10));
		currTstmp = formatDateNew(currTstmp);
		/*if (!firstTimeForecast) {
			getInventoriesQuery = 'SELECT * FROM MY_ROICEAD_TANKINVENTORY as _TI inner join  MY_ROICEAD_sitedetails as site on _TI.Site = site.site  WHERE _TI.Site = ' +
				"'" + site + "' and _TI.TankNum = '" + tank + "' and _TI.MODIFIEDAT >='" + formatDateTime(lastForecastDateTime) + "' order by _TI.MODIFIEDAT desc";
		} else {
			getInventoriesQuery = `SELECT * FROM MY_ROICEAD_TANKINVENTORY  as _TI inner join  MY_ROICEAD_sitedetails as site on _TI.Site = site.site  WHERE _TI.Site = '${site}' and _TI.TankNum = '${tank}' and _TI.MDATE >= '${currTstmp}' order by _TI.regdate desc, _TI.regtime desc`;
		}*/
		if (!firstTimeForecast) {
			getInventoriesQuery = 'SELECT * FROM MY_ROICEAD_TANKINVENTORY WHERE Site = ' +
				"'" + site + "' and TankNum = '" + tank + "' and MODIFIEDAT >='" + formatDateTime(lastForecastDateTime) + "' order by MODIFIEDAT desc";
		} else {
			getInventoriesQuery = 'SELECT * FROM MY_ROICEAD_TANKINVENTORY WHERE Site = ' +
				"'" + site + "' and TankNum = '" + tank + "' and MDATE >= '" + currTstmp + "' order by regdate desc, regtime desc";
		}
		// if (!firstTimeForecast) {
		// 	getInventoriesQuery = 'SELECT * FROM MY_ROICEAD_TANKINVENTORY WHERE Site = ' +
		// 		"'" + site + "' and TankNum = '" + tank + "' and MODIFIEDAT >='" + formatDateTime(lastForecastDateTime) + "' order by mdate desc, mtime desc";
		// } else {
		// 	getInventoriesQuery = 'SELECT * FROM MY_ROICEAD_TANKINVENTORY WHERE Site = ' +
		// 		"'" + site + "' and TankNum = '" + tank + "' and MDATE >= '" + currTstmp + "' order by mdate desc, mtime desc";
		// }
		var deltaInventories = await connectn.executeQuery(getInventoriesQuery);
		return deltaInventories;

	}

	async function getTankLastForecastDetails(site, tank) {
		var lastForecastQuery = 'SELECT TOP 1 * FROM MY_ROICEAD_DEMANDFORECAST WHERE Site_Site = ' +
			"'" + site + "' and Tank = '" + tank + "' and Entry_Type = 'DMF' ORDER BY MODIFIEDAT DESC";
		var lastForecastRes = await connectn.executeQuery(lastForecastQuery);
		if (lastForecastRes[0]) {
			return lastForecastRes[0];
		} else {
			return null;
		}
	}

	function formatDateTime(date) {
		var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();

		var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
		var HH = (date.getHours() < 10 ? '0' : '') + date.getHours();
		var Min = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
		var SS = (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
		var time = (HH + ":" + Min + ":" + SS);
		var dateformatted = date.getFullYear() + "-" + MM + "-" + dd + "T" + time;
		return (dateformatted);
	}
    function getMonthName(date){
        const monthNames = ["January", "February", "March", "April", "May", "June",
                             "July", "August", "September", "October", "November", "December"];

        const d = new Date(date);
        let MonthName =  monthNames[d.getMonth()] ;
        var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
        return (MM + "/" + MonthName) ;
    }
	function formatTime(date) {
		var HH = (date.getHours() < 10 ? '0' : '') + date.getHours();
		var MM = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
		var time = (HH + ":" + MM + ":00.00");
		return time;
	}

	function formatDate(date) {
		var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();

		var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);

		return (date.getFullYear() + "-" + MM + "-" + dd + "T00:00:00");
	}
	function formatDateNew(date) {
		var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();

		var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);

		return (date.getFullYear() + "-" + MM + "-" + dd );
	}

	async function getTanksWithLatestInventory(Site) {
		//var connectn = $.hdb.getConnection();
		/*var tankQuery = "select * from MY_ROICEAD_TANKS AS TANKS LEFT OUTER JOIN MY_ROICEAD_TANKINVENTORY AS TI ON TANKS.SITE = TI.SITE AND TANKS.TANKNUM = TI.TANKNUM WHERE " +
						"TI.MDATE = (SELECT MAX(TI.MDATE) FROM MY_ROICEAD_TANKINVENTORY AS TI WHERE  TI.Site = '" + Site +"' AND TI.TANKNUM = TANKS.TANKNUM) ORDER BY TI.TANKNUM,TI.MDATE, TI.MTIME DESC " ;*/
		var tankQuery = "Select * from MY_ROICEAD_TANKS where SITE = '" + Site + "' and status = 'ACTIVE'";
		var result = await connectn.executeQuery(tankQuery);
		for (var i = 0; i < result.length; i++) {
			result[i].MaterialDesc = "";
			result[i].MaterialId = "";
			result[i].MDATE = null;
			result[i].MTIME = null;
			var inventoryQuery = "select * from MY_ROICEAD_TANKINVENTORY AS TI WHERE  TI.Site = '" + Site + "' AND TI.TANKNUM = '" + result[i].TANKNUM +
				"' AND TI.MDATE = (SELECT MAX(MDATE) FROM MY_ROICEAD_TANKINVENTORY  WHERE Site = '" + Site + "' and TankNum = '" + result[i].TANKNUM +
				"') ORDER BY TI.TANKNUM,TI.MDATE, TI.MTIME DESC ";
			var inventoryRes = await connectn.executeQuery(inventoryQuery);
			var materialQuery =
				'SELECT TOP 1 * FROM MY_ROICEAD_MATERIALALLOCATION WHERE Valid_from < (SELECT CURRENT_DATE "current date" FROM DUMMY) and site = ' +
				"'" + Site + "' and TankNum = '" + result[i].TANKNUM + "' ORDER BY Valid_from DESC";
			/*var materialQuery = 'SELECT * FROM MY_ROICEAD_MATERIALALLOCATION as MatAll  WHERE  site = '
								+ "'" + Site + "' and TankNum = '" + result[i].TANKNUM + "' ORDER BY Valid_from DESC" */

			var matRes = await connectn.executeQuery(materialQuery);
			if (inventoryRes.length >= 1) {
				result[i].MQUAN = inventoryRes[inventoryRes.length - 1].MQUAN;
				result[i].MDATE = inventoryRes[inventoryRes.length - 1].MDATE;
				result[i].MTIME = inventoryRes[inventoryRes.length - 1].MTIME;
				result[i].MaterialId = inventoryRes[inventoryRes.length - 1].MATERIALID;
				result[i].MaterialDesc = inventoryRes[inventoryRes.length - 1].MATERIALDESC;
			} else {
				result[i].MQUAN = "0.0";
			}
			if (matRes[0]) {
				result[i].MaterialId = matRes[0].MATERIALID_MATERIALID;
				result[i].Valid_from = matRes[0].VALID_FROM;
			}
			if (result[i].MaterialId !== "") {
				var matDesc = "Select Top 1 materialid,  materialdesc from MY_ROICEAD_MATERIALS where materialid='" + result[i].MaterialId + "'";
				var matDscRes = await connectn.executeQuery(matDesc);
				if (matDscRes[0]) {
					result[i].MaterialDesc = matDscRes[0].MATERIALDESC;
				}

			}
		}
		//connectn.close();
		return result;
	}

	async function getSiteTankDetails(site) {
		var getTankDetailsQuery = "SELECT * FROM MY_ROICEAD_TANKS where site = '" + site + "' order by tank_grp";
		var tankdetails = await connectn.executeQuery(getTankDetailsQuery);
		return tankdetails;
	}