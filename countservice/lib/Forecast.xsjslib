/*
1. Get tank properties top safety, unpumpable, safety buffer etc
2. Get last executed forecast time from forecast app
3. Get all the delta inventories and save them in Forecast table.
4. Delete all the Forecast entries for Future date from last Inventory Date.
5. Create forecast from last inventory for next 5 days.
6. Adapt tank events based on properties
7. Create replenishment order for Safety buffer hit event

*/
var connectn = await $.hdb.getConnection();

var replOrder = [];
var Forecast = {
	executeForecast : async function (site, tankfilter) {
		console.log("executeForecast in Forecast");
		var selectedTanks = tankfilter.split(",");
		var groupedTanks = await Forecast.getGroupedTanksWithSFBHit(site, selectedTanks);
		var noOfOrders = 0;
		await Forecast.deleteFutureOrders(site);
		for (var j = 0; j < groupedTanks.length; j++) {
			if (groupedTanks[j].isSelected) {
				var tanks = groupedTanks[j].Tanks;
				var replOrderDet = [];
				for (var i = 0; i < tanks.length; i++) {
					var tank = tanks[i].TANKNUM;
					var firstTimeForecast = false;
					var lastForecastDateTime;
					var lastForecasted = await Forecast.getTankLastForecastDetails(site, tank);
					var tankdetails = tanks[i];
					if (lastForecasted === null) {
						lastForecastDateTime = '1990-01-01T00:00:00.000Z';
						firstTimeForecast = true;
					} else {
						lastForecastDateTime = lastForecasted.MODIFIEDAT;
					}
					var deltaInventories = await Forecast.getDeltaInventories(site, tank, lastForecastDateTime, firstTimeForecast);
					if (!(deltaInventories.length === 0 && firstTimeForecast)) {
						if (deltaInventories.length > 0) {
							await Forecast.saveInventoryInForecastTable(deltaInventories, tankdetails);
							await Forecast.deleteForecastedInventories(site, tank);
							var currInvDate = new Date(deltaInventories[0].MDATE);
							currInvDate = new Date(currInvDate.setHours(deltaInventories[0].MTIME.getHours()));
							var orders = await Forecast.getReplenishmentOrders(site, tank, currInvDate);
							groupedTanks[j].Tanks[i].Inventory = deltaInventories[0];
							groupedTanks[j].Tanks[i].MQUAN = deltaInventories[0].MQUAN;
							groupedTanks[j].Tanks[i].Inventory.currInvDate = currInvDate;
							groupedTanks[j].Tanks[i].Orders = orders;
							await Forecast.saveOldRORD(groupedTanks[j].Tanks[i]);
						} else {
							var inventory = await Forecast.getForecastedInventoryCurrTime(site, tank);
							if (inventory && inventory !== null) {
								inventory = Forecast.mapFItoTI(inventory);
								await Forecast.deleteForecastedInventoriesOlderThanCurrTime(site, tank);
								var currInvDate = new Date(inventory.MDATE);
								var orders = await Forecast.getReplenishmentOrders(site, tank, currInvDate);
								currInvDate = new Date(currInvDate.setHours(inventory.MTIME.getHours()));
								groupedTanks[j].Tanks[i].Inventory = inventory;
								groupedTanks[j].Tanks[i].Inventory.currInvDate = currInvDate;
								groupedTanks[j].Tanks[i].Orders = orders;
								await Forecast.saveOldRORD(groupedTanks[j].Tanks[i]);
							}
						}
					}
					await Forecast.deleteInventoriesOlderThanTenDays(site, tank);
				}
				noOfOrders = await Forecast.executeForecastSimultaneously(groupedTanks[j]);
			}
			await Forecast.createReplenishmentOrder(noOfOrders);
		}
		connectn.close();
		return true;
	},


	/* Order Creation */
	getReplenishmentOrderNumber : async function () {
		var connectn = await $.hdb.getConnection();
		var query = 'SELECT GETORDERNUMBER.NEXTVAL FROM DUMMY';
		var result = await connectn.executeQuery(query);
		var order = result[0]['GETORDERNUMBER.NEXTVAL']._val;

		return order;
	},

	getReplenishmentOrders : async function (site, tank, date) {
		var connectn = await  $.hdb.getConnection();
		var orderquery = "SELECT * FROM MY_ROICEAD_REPLENISHMENTORDERS where status='RLSD' and isStatusChgd=false and site_site ='" + site + "' and tanknum='" + tank + "' and suppl_date >='" + Forecast.formatDate(date) + "'";
		var orders = await connectn.executeQuery(orderquery);
		return orders;
	},
	createReplenishmentOrder : async function (noOfOrders) {
		var conn = await $.db.getConnection();
		var so = conn.prepareStatement(
			'INSERT INTO MY_ROICEAD_REPLENISHMENTORDERS VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
		if (noOfOrders > 0) {
			so.setBatchSize(replOrder.length);
			var orders = [];
			for (var k = 0; k < noOfOrders; k++) {
				var sonumber = "A" + await Forecast.getReplenishmentOrderNumber();
				orders.push(sonumber.toString());
			}
			replOrder.sort(function (a, b) {
				return a.orderNumber - b.orderNumber;
			});
			var orderitems = replOrder;
			var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
			var currTstmpResult = await conn.executeQuery(currTimestampQuery);
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

				so.setTimestamp(11, Forecast.formatDate(orderitems[i].Suppl_Date)); /*11SUPPL_DATE <TIMESTAMP>*/
				so.setTime(12, Forecast.formatTime(orderitems[i].Suppl_Time), 'HH:MI:SS'); /*12SUPPL_TIME <NVARCHAR(10)>*/
				so.setString(13, 'UTC'); /*SUPPL_TIMEZONE <NVARCHAR(10)>*/
				so.setString(14, '2:00:00'); /*SUPPL_LOW_TOL <NVARCHAR(10)>*/
				so.setString(15, '2:00:00'); /*SUPPL_HIGH_TOL <NVARCHAR(10)>*/
				so.setString(16, ('500')); /*SUPPL_LOW_QTY <NVARCHAR(10)>*/
				so.setString(17, '500'); /*SUPPL_HIGH_QTY <NVARCHAR(10)>*/
				so.setTimestamp(18, Forecast.calculateCutOffDate(orderitems[i].Cutoff_Date)); /*CUTOFF_DATE <TIMESTAMP>*/
				so.setTime(19, Forecast.formatTime(orderitems[i].Suppl_Time), 'HH:MI:SS'); /*CUTOFF_TIME <NVARCHAR(10)>*/
				so.setDate(20, Forecast.formatDate(currTstmp)); /*REGDATE <DATE>*/
				so.setTime(21, Forecast.formatTime(currTstmp), 'HH:MI:SS'); /*REGTIME <TIME>*/
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
			await so.executeBatch();
			await conn.commit();
			await conn.close();
		}
		replOrder = [];
	},
	
	deleteInventoriesOlderThanTenDays : async function (site, tank) {
		var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;
		currTstmp = new Date(currTstmp.setDate(currTstmp.getDate() - 10));
		currTstmp = Forecast.formatDateTime(currTstmp);
		var delQ = "delete from MY_ROICEAD_FORECASTCALCULATION where site='" + site + "' and tank ='" + tank +
			"' and Entry_Type='INV' and ForecastedTimestamp  <='" + currTstmp + "'";
		var deleted = await connectn.executeUpdate(delQ);
		await connectn.commit();
		return true;
	},
	

	deleteForecastedInventoriesOlderThanCurrTime : async function (site, tank) {
		var delQ = "delete from MY_ROICEAD_FORECASTCALCULATION where site='" + site + "' and tank ='" + tank +
			"' and (Entry_Type='FCT' or Entry_Type='SFCT' or Entry_Type='ORD' or Entry_Type='RORD')";
		var deleted = await connectn.executeUpdate(delQ);
		await connectn.commit();
		return true;
	},
	

	getForecastedInventoryCurrTime : async function (site, tank) {
		var lastForecastQuery = 'SELECT TOP 1 * FROM MY_ROICEAD_FORECASTCALCULATION WHERE Site = ' +
			"'" + site + "' and Tank = '" + tank +
			"' and Entry_Type = 'FCT' and ForecastedTimestamp  <= ( select current_timestamp from dummy)  ORDER BY MODIFIEDAT DESC";
		var lastForecastRes = await connectn.executeQuery(lastForecastQuery);
		if (lastForecastRes[0]) {
			return lastForecastRes[0];
		} else {
			return null;
		}
	},
	
	deleteFutureOrders :	async function (site) {
			var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
			var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
			var currTstmp = (currTstmpResult[0].CURRENT_TIMESTAMP);
			currTstmp = new Date(currTstmp.setMinutes(currTstmp.getMinutes() - 3 ));
			var createdAt = Forecast.formatDateTime(currTstmp);
			var delQ = "delete FROM MY_ROICEAD_REPLENISHMENTORDERS where Site_Site = '" + site + "' and SUPPL_DATE >= (Select current_date from dummy) and STATUS = 'CRT' and isStatusChgd = false and CREATEDAT < '" + createdAt + "'" ;
			var deleted = await connectn.executeUpdate(delQ);
			await connectn.commit();
			return true;
	},

	deleteForecastedInventories :	async function (site, tank) {
			var delQ = "delete from MY_ROICEAD_FORECASTCALCULATION where  (Entry_Type='FCT' or  Entry_Type='SFCT' or Entry_Type='ORD' or Entry_Type='RORD'  ) and site='" +
				site + "' and tank ='" + tank + "'";
			var deleted = await connectn.executeUpdate(delQ);
			await connectn.commit();
			return true;
		},

	getTankDetails : 	async function (site, tank) {
			var getTankDetailsQuery = "SELECT * FROM MY_ROICEAD_TANKS where site = '" + site + "' and tanknum ='" + tank + "'";
			var tankdetails = await connectn.executeQuery(getTankDetailsQuery);
			return tankdetails[0];
		},

	getGroupedTanksWithSFBHit : async function (site, seltanks) {
		var tankDetails = await Forecast.getSiteTankDetails(site);
		var lastInventory = await Forecast.getTanksWithLatestInventory(site);
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
	},

	// function getReplenishmentOrder() {

	// 	var query = 'SELECT GETORDERNUMBER.NEXTVAL FROM DUMMY';
	// 	var result = connectn.executeQuery(query);
	// 	var count = result[0]['GETORDERNUMBER.NEXTVAL']._val;
	// 	return count;
	// }

	mapFItoTI : function (inventory) {
		return {
			"MDATE": inventory.FORECAST_DATE,
			"MTIME": inventory.FORECAST_TIME,
			"MQUAN": inventory.FORECAST_QTY,
			"SITE": inventory.SITE,
			"TANKNUM": inventory.TANK,
			"MATERIALID": inventory.MATERIAL
		}
	},

	saveOldRORD : async function (tank) {
		var conn = await $.db.getConnection();
		var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;

		var orderNumber = 0;

		for (var k = 0; k < tank.Orders.length; k++) {
			var st = conn.prepareStatement('INSERT INTO MY_ROICEAD_FORECASTCALCULATION VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
			var order = tank.Orders[k];
			var currInvDate = tank.Inventory.currInvDate;
			var suppl_date = new Date(order.SUPPL_DATE);
			var suppl_time = order.SUPPL_TIME.split(":");
			suppl_date = new Date(suppl_date.setHours(suppl_time[0]));
			if (currInvDate.getDate() >= suppl_date.getDate() && currInvDate.getMonth() >= suppl_date.getMonth() &&
				currInvDate.getFullYear() >= suppl_date.getFullYear() && currInvDate.getHours() > parseInt(suppl_time[0])) {

				st.setTimestamp(1, currTstmp); //crtd at
				st.setString(2, "D.Pagonis"); //crtdby
				st.setTimestamp(3, currTstmp);
				st.setString(4, "D.Pagonis");
				st.setString(5, tank.Inventory.SITE);
				st.setString(6, tank.Inventory.TANKNUM);
				st.setDate(7, Forecast.formatDate(suppl_date)); //ForecastDate
				st.setTime(8, Forecast.formatTime(suppl_date), 'HH:MI:SS'); //ForecastTinme
				st.setString(9, 'RORD'); //ENTRY_TYPE
				st.setString(10, tank.Inventory.MATERIALID); //MATERIAL
				st.setString(11, ' '); // Tankgrp
				st.setInteger(12, 0); //0==false, 1 ==true CRITICAL_TANK
				st.setString(13, ''); //PROFILE_DAY
				st.setString(14, ''); //PROFILE_PHD
				st.setString(15, ''); //PROFILE
				st.setString(16, ''); //PROFILE_TYPE
				st.setString(17, ''); // FACTOR
				st.setDecimal(18, parseFloat(order.SUPPL_QTY)); //Forecast Qty
				st.setDecimal(19, order.SUPPL_QTY); //Forecast Inv
				st.setString(20, ''); //FORECAST_EVT
				st.setTimestamp(21, Forecast.formatDateTime(currInvDate)); //ForecastedDateTime
				await st.executeUpdate();
				await conn.commit();
			}
		}
		await conn.close();
	},
	calculateCutOffDate : function (date) {
		var cutoffdate = new Date(date.setDate(date.getDate() - 1));
		return Forecast.formatDate(cutoffdate);
	},
	executeForecastSimultaneously : async function (groupedTanks) {
		var conn = await $.db.getConnection();
		var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;
		var st = conn.prepareStatement('INSERT INTO MY_ROICEAD_FORECASTCALCULATION VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

		var orderNumber = 0;
		st.setBatchSize(1000);
		var currDate = new Date(currTstmpResult[0].CURRENT_TIMESTAMP);
		var forecastLastDate = new Date();
		forecastLastDate = forecastLastDate.setDate(forecastLastDate.getDate() + 5);
		var hitSFBInPrevLoop = false;
		var stopForecast = false;
		var x = 0;

		while (!stopForecast) {
			var entry_type = 'FCT';
			var forecast_event = '';
			var critical_tank = 0;
			for (var i = 0; i < groupedTanks.Tanks.length; i++) {
				var tankdetails = groupedTanks.Tanks[i];
				var inventory = groupedTanks.Tanks[i].Inventory;
				if (hitSFBInPrevLoop === x) {
					var orderdetails = {};
					var curInvDateT = new Date(groupedTanks.Tanks[i].Inventory.currInvDate.setHours(groupedTanks.Tanks[i].Inventory.currInvDate.getHours()));
					orderdetails = {
						"SITE": groupedTanks.Tanks[i].Inventory.SITE,
						"TANKNUM": groupedTanks.Tanks[i].Inventory.TANKNUM,
						"ORDERQTY": (parseFloat(tankdetails.TARLVL_VOL) - (tankdetails.MQUAN)),
						"Suppl_Date": curInvDateT,
						"Suppl_Time": curInvDateT,
						"Cutoff_Date": curInvDateT,
						"orderNumber": orderNumber,
						"MATERIALID": tankdetails.MATERIALID,
						"MATERIALDESC": tankdetails.MATERIALDESC
					}
					if (Forecast.formatDate(groupedTanks.Tanks[i].Inventory.currInvDate) >= Forecast.formatDate(currTstmp) && orderNumber !== 0) {
						replOrder.push(orderdetails);
					}
					tankdetails.MQUAN = tankdetails.MQUAN + orderdetails.ORDERQTY;

					st.setTimestamp(1, currTstmp);
					st.setString(2, "D.Pagonis");
					st.setTimestamp(3, currTstmp);
					st.setString(4, "D.Pagonis");
					st.setString(5, groupedTanks.Tanks[i].Inventory.SITE);
					st.setString(6, groupedTanks.Tanks[i].Inventory.TANKNUM);
					st.setDate(7, Forecast.formatDate(curInvDateT));
					st.setTime(8, Forecast.formatTime(curInvDateT), 'HH:MI:SS');
					st.setString(9, 'ORD');
					st.setString(10, groupedTanks.Tanks[i].Inventory.MATERIALID);
					st.setString(11, ' ');
					st.setInteger(12, critical_tank);
					st.setString(13, '');
					st.setString(14, '');
					st.setString(15, '');
					st.setString(16, '');
					st.setString(17, '');
					st.setDecimal(18, parseFloat(orderdetails.ORDERQTY));
					st.setDecimal(19, tankdetails.MQUAN);
					st.setString(20, forecast_event);
					st.setTimestamp(21, Forecast.formatDateTime(curInvDateT));
					st.addBatch();
				}
				groupedTanks.Tanks[i].Inventory.currInvDate = new Date(groupedTanks.Tanks[i].Inventory.currInvDate.setHours(groupedTanks.Tanks[i].Inventory.currInvDate.getHours() + 1));
				for (var k = 0; k < groupedTanks.Tanks[i].Orders.length; k++) {
					var order = groupedTanks.Tanks[i].Orders[k];
					var currInvDate = groupedTanks.Tanks[i].Inventory.currInvDate;
					var suppl_date = new Date(order.SUPPL_DATE);
					var suppl_time = order.SUPPL_TIME.split(":");
					suppl_date = new Date(suppl_date.setHours(suppl_time[0]));
					if (currInvDate.getDate() === suppl_date.getDate() && currInvDate.getMonth() === suppl_date.getMonth() &&
						currInvDate.getFullYear() === suppl_date.getFullYear() && currInvDate.getHours() === suppl_time[0]) {
						tankdetails.MQUAN = tankdetails.MQUAN + parseFloat(order.SUPPL_QTY);
						st.setTimestamp(1, currTstmp);
						st.setString(2, "D.Pagonis");
						st.setTimestamp(3, currTstmp);
						st.setString(4, "D.Pagonis");
						st.setString(5, groupedTanks.Tanks[i].Inventory.SITE);
						st.setString(6, groupedTanks.Tanks[i].Inventory.TANKNUM);
						st.setDate(7, Forecast.formatDate(currInvDate));
						st.setTime(8, Forecast.formatTime(currInvDate), 'HH:MI:SS');
						st.setString(9, 'RORD');
						st.setString(10, groupedTanks.Tanks[i].Inventory.MATERIALID);
						st.setString(11, ' ');
						st.setInteger(12, critical_tank);
						st.setString(13, '');
						st.setString(14, '');
						st.setString(15, '');
						st.setString(16, '');
						st.setString(17, '');
						st.setDecimal(18, parseFloat(order.SUPPL_QTY));
						st.setDecimal(19, tankdetails.MQUAN);
						st.setString(20, forecast_event);
						st.setTimestamp(21, Forecast.formatDateTime(currInvDate));
						st.addBatch();
						break;
					}
				}
				if (tankdetails.MQUAN <= parseFloat(tankdetails.BTMSAF_VOL)) {
					critical_tank = 1;
					hitSFBInPrevLoop = x + 1;
					if (Forecast.formatDate(groupedTanks.Tanks[i].Inventory.currInvDate) >= Forecast.formatDate(currTstmp)) {
						orderNumber = orderNumber + 1;
					}
				}
				if (tankdetails.MQUAN <= parseFloat(tankdetails.BTMSAF_VOL)) {
					forecast_event = 'SFB';
				}
				if (x === 0) {
					entry_type = 'SFCT';
				}
				if ((currDate.getTime() < groupedTanks.Tanks[i].Inventory.currInvDate.getTime()) || x === 0) {
					st.setTimestamp(1, currTstmp);
					st.setString(2, "D.Pagonis");
					st.setTimestamp(3, currTstmp);
					st.setString(4, "D.Pagonis");
					st.setString(5, groupedTanks.Tanks[i].Inventory.SITE);
					st.setString(6, groupedTanks.Tanks[i].Inventory.TANKNUM);
					st.setDate(7, Forecast.formatDate(groupedTanks.Tanks[i].Inventory.currInvDate));
					st.setTime(8, Forecast.formatTime(groupedTanks.Tanks[i].Inventory.currInvDate), 'HH:MI:SS');
					st.setString(9, entry_type);
					st.setString(10, groupedTanks.Tanks[i].Inventory.MATERIALID);
					st.setString(11, ' ');
					st.setInteger(12, critical_tank);
					st.setString(13, '');
					st.setString(14, '');
					st.setString(15, '');
					st.setString(16, '');
					st.setString(17, '');
					st.setDecimal(18, 0.0);
					st.setDecimal(19, tankdetails.MQUAN);
					st.setString(20, forecast_event);
					st.setTimestamp(21, Forecast.formatDateTime(groupedTanks.Tanks[i].Inventory.currInvDate));
					st.addBatch();
				}
				tankdetails.MQUAN = tankdetails.MQUAN - 500;
			}
			if (groupedTanks.Tanks[0].Inventory.currInvDate >= forecastLastDate) {
				stopForecast = true;
			}
			x = x + 1;
		}
		await st.executeBatch();
		await conn.commit();
		await conn.close();

		return orderNumber;
	},
	runForecastForNext5Days : async function (inventory, tankdetails, tankGrp) {
		var mquan = parseFloat(tankdetails.MQUAN);
		var conn = await $.db.getConnection();
		var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;
		var st = conn.prepareStatement('INSERT INTO MY_ROICEAD_FORECASTCALCULATION VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

		var orderNumber = 0;
		st.setBatchSize(135);
		var currDate = new Date(currTstmpResult[0].CURRENT_TIMESTAMP);
		var currInvDate = new Date(inventory.MDATE);
		currInvDate = new Date(currInvDate.setHours(inventory.MTIME.getHours()));
		var hoursDiff = Math.abs(currDate.getTime() - currInvDate.getTime()) / 3600000;
		var forecastLoop = hoursDiff + 120;
		var volToHitSFB = tankGrp.minHoursToReachSFB;
		var criticalTank = tankGrp.criticalTank;
		var hitSFBInPrevLoop = false;
		for (var x = 0; x < forecastLoop; x++) {
			var entry_type = 'FCT';
			var forecast_event = '';
			var critical_tank = 0;
			if (hitSFBInPrevLoop) {
				mquan = mquan + orderdetails.ORDERQTY + 500;
				hitSFBInPrevLoop = false;
				st.setTimestamp(1, currTstmp); //crtd at
				st.setString(2, "D.Pagonis"); //crtdby
				st.setTimestamp(3, currTstmp);
				st.setString(4, "D.Pagonis");
				st.setString(5, inventory.SITE);
				st.setString(6, inventory.TANKNUM);
				st.setDate(7, Forecast.formatDate(currInvDate)); //ForecastDate
				st.setTime(8, Forecast.formatTime(currInvDate), 'HH:MI:SS'); //ForecastTinme
				st.setString(9, 'ORD'); //ENTRY_TYPE
				st.setString(10, inventory.MATERIALID); //MATERIAL
				st.setString(11, ' '); // Tankgrp
				st.setInteger(12, critical_tank); //0==false, 1 ==true CRITICAL_TANK
				st.setString(13, ''); //PROFILE_DAY
				st.setString(14, ''); //PROFILE_PHD
				st.setString(15, ''); //PROFILE
				st.setString(16, ''); //PROFILE_TYPE
				st.setString(17, ''); // FACTOR
				st.setDecimal(18, parseFloat(orderdetails.ORDERQTY)); //Forecast Qty
				st.setDecimal(19, mquan); //Forecast Inv
				st.setString(20, forecast_event); //FORECAST_EVT
				st.setTimestamp(21, Forecast.formatDateTime(currInvDate)); //ForecastedDateTime
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
				volToHitSFB = volToHitSFB + tankGrp.minHoursToReachSFBAfterOrder;
				criticalTank = tankGrp.criticalTankAfterOrder;
				hitSFBInPrevLoop = true;
				if (Forecast.formatDate(currInvDate) >= Forecast.formatDate(currTstmp)) {
					replOrder.push(orderdetails);
					orderNumber = orderNumber + 1;
				}
			}
			if (mquan <= parseFloat(tankdetails.BTMSAF_VOL)) {
				forecast_event = 'SFB';
			}
			if (x === 0) {
				entry_type = 'SFCT';
			}
			currInvDate = new Date(currInvDate.setHours(currInvDate.getHours() + 1));
			if (!(x < hoursDiff) || x === 0) {
				st.setTimestamp(1, currTstmp); //crtd at
				st.setString(2, "D.Pagonis"); //crtdby
				st.setTimestamp(3, currTstmp);
				st.setString(4, "D.Pagonis");
				st.setString(5, inventory.SITE);
				st.setString(6, inventory.TANKNUM);
				st.setDate(7, Forecast.formatDate(currInvDate)); //ForecastDate
				st.setTime(8, Forecast.formatTime(currInvDate), 'HH:MI:SS'); //ForecastTinme
				st.setString(9, entry_type); //ENTRY_TYPE
				st.setString(10, inventory.MATERIALID); //MATERIAL
				st.setString(11, ' '); // Tankgrp
				st.setInteger(12, critical_tank); //0==false, 1 ==true CRITICAL_TANK
				st.setString(13, ''); //PROFILE_DAY
				st.setString(14, ''); //PROFILE_PHD
				st.setString(15, ''); //PROFILE
				st.setString(16, ''); //PROFILE_TYPE
				st.setString(17, ''); // FACTOR
				st.setDecimal(18, 0.0); //Forecast Qty
				st.setDecimal(19, mquan); //Forecast Inv
				st.setString(20, forecast_event); //FORECAST_EVT
				st.setTimestamp(21, Forecast.formatDateTime(currInvDate)); //ForecastedDateTime
				st.addBatch();
			}
			mquan = mquan - 500;
		}
		await st.executeBatch();
		await conn.commit();
		await conn.close();
		return (orderNumber + 1);
	},

	saveInventoryInForecastTable : async function (inventories, tankdetails) {
		var conn = await $.db.getConnection();
		var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;
		var st = conn.prepareStatement('INSERT INTO MY_ROICEAD_FORECASTCALCULATION VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
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
			st.setString(5, inventories[x].SITE);
			st.setString(6, inventories[x].TANKNUM);
			st.setDate(7, inventories[x].MDATE);
			st.setTime(8, inventories[x].MTIME);
			st.setString(9, entry_type); //ENTRY_TYPE
			st.setString(10, inventories[x].MATERIALID); //MATERIAL
			st.setString(11, tankdetails.TANK_GRP); // Tankgrp
			st.setInteger(12, 0); //0==false, 1 ==true CRITICAL_TANK
			st.setString(13, ''); //PROFILE_DAY
			st.setString(14, ''); //PROFILE_PHD
			st.setString(15, ''); //PROFILE
			st.setString(16, ''); //PROFILE_TYPE
			st.setString(17, ''); // FACTOR
			st.setDecimal(18, 0.0); //Forecast Qty
			st.setDecimal(19, inventories[x].MQUAN); //Forecast Inv
			st.setString(20, ''); //FORECAST_EVT
			st.setTimestamp(21, Forecast.formatDateTime(currInvDate)); //ForecastedDateTime
			st.addBatch();
		}

		await st.executeBatch();
		await conn.commit();
		await conn.close();
	},

	getDeltaInventories : async function (site, tank, lastForecastDateTime, firstTimeForecast) {
		var getInventoriesQuery;
		var currTimestampQuery = 'SELECT CURRENT_DATE  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_DATE;
		currTstmp = new Date(currTstmp.setDate(currTstmp.getDate() - 10));
		currTstmp = Forecast.formatDate(currTstmp);
		if (!firstTimeForecast) {
			getInventoriesQuery = 'SELECT * FROM MY_ROICEAD_TANKINVENTORY WHERE Site = ' +
				"'" + site + "' and TankNum = '" + tank + "' and MODIFIEDAT >='" + Forecast.formatDateTime(lastForecastDateTime) + "' order by MODIFIEDAT desc";
		} else {
			getInventoriesQuery = 'SELECT * FROM MY_ROICEAD_TANKINVENTORY WHERE Site = ' +
				"'" + site + "' and TankNum = '" + tank + "' and MDATE >= '" + currTstmp + "' order by regdate desc, regtime desc";
		}
		var deltaInventories = await connectn.executeQuery(getInventoriesQuery);
		return deltaInventories;
	},

	getTankLastForecastDetails : async function (site, tank) {
		var lastForecastQuery = 'SELECT TOP 1 * FROM MY_ROICEAD_FORECASTCALCULATION WHERE Site = ' +
			"'" + site + "' and Tank = '" + tank + "' and Entry_Type = 'FCT' ORDER BY MODIFIEDAT DESC";
		var lastForecastRes = await connectn.executeQuery(lastForecastQuery);
		if (lastForecastRes[0]) {
			return lastForecastRes[0];
		} else {
			return null;
		}
	},

	formatDateTime : function (date) {
		var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();

		var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
		var HH = (date.getHours() < 10 ? '0' : '') + date.getHours();
		var Min = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
		var SS = (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
		var time = (HH + ":" + Min + ":" + SS);
		var dateformatted = date.getFullYear() + "-" + MM + "-" + dd + "T" + time;
		return (dateformatted);
	},

	formatTime : function (date) {
		var HH = (date.getHours() < 10 ? '0' : '') + date.getHours();
		var MM = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
		var time = (HH + ":" + MM + ":00.00");
		return time;
	},

	formatDate : function (date) {
		var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();

		var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);

		return (date.getFullYear() + "-" + MM + "-" + dd + "T00:00:00");
	},

	getTanksWithLatestInventory : async function (Site) {
		var connectn = await $.hdb.getConnection();
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
		await connectn.close();
		return result;
	},

	getSiteTankDetails : async function (site) {
		var getTankDetailsQuery = "SELECT * FROM MY_ROICEAD_TANKS where site = '" + site + "' order by tank_grp";
		var tankdetails = await connectn.executeQuery(getTankDetailsQuery);
		return tankdetails;
	}
};
export default Forecast;