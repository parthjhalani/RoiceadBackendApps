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
							console.log("deleteForecastedInventories");
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
		await connectn.close();
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
	createReplenishmentOrder: async function(noOfOrders) {
    var conn = await $.hdb.getConnection();
    try {
        if (noOfOrders > 0) {
            var orders = [];
            for (var k = 0; k < noOfOrders; k++) {
                var sonumber = "A" + await Forecast.getReplenishmentOrderNumber();
                orders.push(sonumber.toString());
            }
            
            replOrder.sort((a, b) => a.orderNumber - b.orderNumber);
            
            var currTstmpResult = await conn.executeQuery('SELECT CURRENT_TIMESTAMP FROM DUMMY');
            var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;
            
            var x = 1;
            var prevOrderNumber = 0;
            
            for (var i = 0; i < replOrder.length; i++) {
                if (prevOrderNumber !== replOrder[i].orderNumber) {
                    x = 1;
                    prevOrderNumber = replOrder[i].orderNumber;
                }
                
                var itemno = x < 10 ? "00" + (x * 10) : "00" + x;
                
                var sql = `INSERT INTO MY_ROICEAD_REPLENISHMENTORDERS VALUES(
                    '${currTstmp}',                          /*CREATEDAT <TIMESTAMP>*/
                    'D.Pagonis',                            /*CREATEDBY <NVARCHAR(255)>*/
                    '${currTstmp}',                         /*MODIFIEDAT <TIMESTAMP>*/
                    'D.Pagonis',                            /*MODIFIEDBY <NVARCHAR(255)>*/
                    '${orders[(parseInt(replOrder[i].orderNumber) - 1)]}', /*ORDERNO <NVARCHAR(15)>*/
                    '${itemno}',                            /*ITEM <NVARCHAR(6)>*/
                    'CRT',                                  /*STATUS <NVARCHAR(4)>*/
                    0,                                      /*ISSTATUSCHGD <BOOLEAN>*/
                    'ASR',                                  /*ORDERTYPE <NVARCHAR(3)>*/
                    '${replOrder[i].SITE}',                 /*SITE_SITE <NVARCHAR(10)>*/
                    'FUELS',                                /*SITE_SITETYPE <NVARCHAR(5)>*/
                    '${replOrder[i].TANKNUM}',              /*TANKNUM <NVARCHAR(10)>*/
                    '',                                     /*BPTYPE <NVARCHAR(4)>*/
                    '',                                     /*SUPPL_BP <NVARCHAR(10)>*/
                    '${replOrder[i].MATERIALID}',           /*SUPPL_MAT_MATERIALID <NVARCHAR(18)>*/
                    ${replOrder[i].ORDERQTY},               /*SUPPL_QTY <DECIMAL>*/
                    'L',                                    /*SUPPL_UOM <NVARCHAR(10)>*/
                    '${Forecast.formatDate(replOrder[i].Suppl_Date)}', /*SUPPL_DATE <TIMESTAMP>*/
                    '${Forecast.formatTime(replOrder[i].Suppl_Time)}', /*SUPPL_TIME <NVARCHAR(10)>*/
                    'UTC',                                  /*SUPPL_TIMEZONE <NVARCHAR(10)>*/
                    '2:00:00',                             /*SUPPL_LOW_TOL <NVARCHAR(10)>*/
                    '2:00:00',                             /*SUPPL_HIGH_TOL <NVARCHAR(10)>*/
                    '500',                                  /*SUPPL_LOW_QTY <NVARCHAR(10)>*/
                    '500',                                  /*SUPPL_HIGH_QTY <NVARCHAR(10)>*/
                    '${Forecast.calculateCutOffDate(replOrder[i].Cutoff_Date)}', /*CUTOFF_DATE <TIMESTAMP>*/
                    '${Forecast.formatTime(replOrder[i].Suppl_Time)}', /*CUTOFF_TIME <NVARCHAR(10)>*/
                    '${Forecast.formatDate(currTstmp)}',    /*REGDATE <DATE>*/
                    '${Forecast.formatTime(currTstmp)}',    /*REGTIME <TIME>*/
                    'D.Pagonis'                            /*REGUSER <NVARCHAR(50)>*/
                )`;
                
                await conn.executeUpdate(sql);
                x++;
            }
            await conn.commit();
        }
        replOrder = [];
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
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

	saveOldRORD: async function (tank) {
    var conn = await $.hdb.getConnection();
    var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP FROM DUMMY';
    var currTstmpResult = await conn.executeQuery(currTimestampQuery);
    var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;

    var orderNumber = 0;

    for (var k = 0; k < tank.Orders.length; k++) {
        var order = tank.Orders[k];
        var currInvDate = tank.Inventory.currInvDate;
        var suppl_date = new Date(order.SUPPL_DATE);
        var suppl_time = order.SUPPL_TIME.split(":");
        suppl_date.setHours(suppl_time[0]);

        if (currInvDate >= suppl_date && currInvDate.getHours() > parseInt(suppl_time[0])) {
            var insertQuery = ` INSERT INTO MY_ROICEAD_FORECASTCALCULATION (
                    CRTD_AT, CRTD_BY, CHGD_AT, CHGD_BY, SITE, TANKNUM, FORECASTDATE,
                    FORECASTTIME, ENTRY_TYPE, MATERIAL, TANKGRP, CRITICAL_TANK,
                    PROFILE_DAY, PROFILE_PHD, PROFILE, PROFILE_TYPE, FACTOR,
                    FORECAST_QTY, FORECAST_INV, FORECAST_EVT, FORECASTEDDATETIME
                ) VALUES (
                    '${currTstmp.toISOString()}', 'D.Pagonis', '${currTstmp.toISOString()}', 'D.Pagonis',
                    '${tank.Inventory.SITE}', '${tank.Inventory.TANKNUM}', '${Forecast.formatDate(suppl_date)}',
                    '${Forecast.formatTime(suppl_date)}', 'RORD', '${tank.Inventory.MATERIALID}', ' ',
                    0, '', '', '', '', '', ${parseFloat(order.SUPPL_QTY)},
                    ${order.SUPPL_QTY}, '', '${Forecast.formatDateTime(currInvDate)}'
                )
            `;

            await conn.executeUpdate(insertQuery);
            await conn.commit();
        }
    }

    await conn.close();
},

	calculateCutOffDate : function (date) {
		var cutoffdate = new Date(date.setDate(date.getDate() - 1));
		return Forecast.formatDate(cutoffdate);
	},
	executeForecastSimultaneously: async function (groupedTanks) {
    var conn = await $.hdb.getConnection();
    var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP FROM DUMMY';
    var currTstmpResult = await conn.executeQuery(currTimestampQuery);
    var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;

    var orderNumber = 0;
    var currDate = new Date(currTstmp);
    var forecastLastDate = new Date();
    forecastLastDate.setDate(forecastLastDate.getDate() + 5);
    var hitSFBInPrevLoop = false;
    var stopForecast = false;
    var x = 0;

    while (!stopForecast) {
        var entry_type = 'FCT';
        var forecast_event = '';
        var critical_tank = 0;

        for (var i = 0; i < groupedTanks.Tanks.length; i++) {
            var tankdetails = groupedTanks.Tanks[i];
            var inventory = tankdetails.Inventory;

            if (hitSFBInPrevLoop === x) {
                var orderdetails = {};
                var curInvDateT = new Date(inventory.currInvDate);
                curInvDateT.setHours(inventory.currInvDate.getHours());
                orderdetails = {
                    "SITE": inventory.SITE,
                    "TANKNUM": inventory.TANKNUM,
                    "ORDERQTY": (parseFloat(tankdetails.TARLVL_VOL) - tankdetails.MQUAN),
                    "Suppl_Date": curInvDateT,
                    "Suppl_Time": curInvDateT,
                    "Cutoff_Date": curInvDateT,
                    "orderNumber": orderNumber,
                    "MATERIALID": tankdetails.MATERIALID,
                    "MATERIALDESC": tankdetails.MATERIALDESC
                };
                if (Forecast.formatDate(inventory.currInvDate) >= Forecast.formatDate(currTstmp) && orderNumber !== 0) {
                    replOrder.push(orderdetails);
                }
                tankdetails.MQUAN += orderdetails.ORDERQTY;

                var insertOrderSQL = ` INSERT INTO MY_ROICEAD_FORECASTCALCULATION (
                        CRTD_AT, CRTD_BY, CHGD_AT, CHGD_BY, SITE, TANKNUM, MDATE, MTIME,
                        ENTRY_TYPE, MATERIAL, TANK_GRP, CRITICAL_TANK, PROFILE_DAY,
                        PROFILE_PHD, PROFILE, PROFILE_TYPE, FACTOR, FORECAST_QTY,
                        FORECAST_INV, FORECAST_EVT, FORECASTEDDATETIME
                    ) VALUES (
                        '${currTstmp}', 'D.Pagonis', '${currTstmp}', 'D.Pagonis',
                        '${inventory.SITE}', '${inventory.TANKNUM}', '${Forecast.formatDate(curInvDateT)}',
                        '${Forecast.formatTime(curInvDateT)}', 'ORD', '${inventory.MATERIALID}', ' ',
                        ${critical_tank}, '', '', '', '', '', ${parseFloat(orderdetails.ORDERQTY)},
                        ${tankdetails.MQUAN}, '${forecast_event}', '${Forecast.formatDateTime(curInvDateT)}'
                    )
                `;
                await conn.executeUpdate(insertOrderSQL);
            }

            inventory?.currInvDate.setHours(inventory.currInvDate.getHours() + 1);

            for (var k = 0; k < tankdetails?.Orders?.length; k++) {
                var order = tankdetails.Orders[k];
                var currInvDate = inventory.currInvDate;
                var suppl_date = new Date(order.SUPPL_DATE);
                var suppl_time = order.SUPPL_TIME.split(":");
                suppl_date.setHours(suppl_time[0]);

                if (
                    currInvDate.getDate() === suppl_date.getDate() &&
                    currInvDate.getMonth() === suppl_date.getMonth() &&
                    currInvDate.getFullYear() === suppl_date.getFullYear() &&
                    currInvDate.getHours() === parseInt(suppl_time[0])
                ) {
                    tankdetails.MQUAN += parseFloat(order.SUPPL_QTY);

                    var insertReceivedOrderSQL = `INSERT INTO MY_ROICEAD_FORECASTCALCULATION (
                            CRTD_AT, CRTD_BY, CHGD_AT, CHGD_BY, SITE, TANKNUM, MDATE, MTIME,
                            ENTRY_TYPE, MATERIAL, TANK_GRP, CRITICAL_TANK, PROFILE_DAY,
                            PROFILE_PHD, PROFILE, PROFILE_TYPE, FACTOR, FORECAST_QTY,
                            FORECAST_INV, FORECAST_EVT, FORECASTEDDATETIME
                        ) VALUES (
                            '${currTstmp}', 'D.Pagonis', '${currTstmp}', 'D.Pagonis',
                            '${inventory.SITE}', '${inventory.TANKNUM}', '${Forecast.formatDate(currInvDate)}',
                            '${Forecast.formatTime(currInvDate)}', 'RORD', '${inventory.MATERIALID}', ' ',
                            ${critical_tank}, '', '', '', '', '', ${parseFloat(order.SUPPL_QTY)},
                            ${tankdetails.MQUAN}, '${forecast_event}', '${Forecast.formatDateTime(currInvDate)}'
                        )
                    `;
                    await conn.executeUpdate(insertReceivedOrderSQL);
                    break;
                }
            }

            if (tankdetails.MQUAN <= parseFloat(tankdetails.BTMSAF_VOL)) {
                critical_tank = 1;
                hitSFBInPrevLoop = x + 1;
                if (Forecast.formatDate(inventory.currInvDate) >= Forecast.formatDate(currTstmp)) {
                    orderNumber += 1;
                }
            }

            if (tankdetails.MQUAN <= parseFloat(tankdetails.BTMSAF_VOL)) {
                forecast_event = 'SFB';
            }

            if (x === 0) {
                entry_type = 'SFCT';
            }

            if (currDate.getTime() < inventory?.currInvDate.getTime() || x === 0) {
                var insertForecastSQL = `INSERT INTO MY_ROICEAD_FORECASTCALCULATION (
					CRTD_AT, CRTD_BY, CHGD_AT, CHGD_BY, SITE, TANKNUM, MDATE, MTIME,
					ENTRY_TYPE, MATERIAL, TANK_GRP, CRITICAL_TANK, PROFILE_DAY,
					PROFILE_PHD, PROFILE, PROFILE_TYPE, FACTOR, FORECAST_QTY,
					FORECAST_INV, FORECAST_EVT, FORECASTEDDATETIME
				) VALUES (
					'${currTstmp}', 'D.Pagonis', '${currTstmp}', 'D.Pagonis',
					'${inventory.SITE}', '${inventory.TANKNUM}', '${Forecast.formatDate(inventory.currInvDate)}',
					'${Forecast.formatTime(inventory.currInvDate)}', '${entry_type}', '${inventory.MATERIALID}', ' ',
					${critical_tank}, '', '', '', '', 0.0, ${tankdetails.MQUAN}, '${forecast_event}', 
					'${Forecast.formatDateTime(groupedTanks.Tanks[i].Inventory.currInvDate)}'
				);`;  

				await conn.executeUpdate(insertForecastSQL);  // <-- Changed from executeQuery to executeUpdate

				}
				tankdetails.MQUAN = tankdetails.MQUAN - 500;
			}
			if (groupedTanks.Tanks[0].Inventory?.currInvDate >= forecastLastDate) {
				stopForecast = true;
			}
			x = x + 1;
		}
		
		await conn.commit();
		await conn.close();

		return orderNumber;
	},
	runForecastForNext5Days: async function (inventory, tankdetails, tankGrp) {
    var mquan = parseFloat(tankdetails.MQUAN);
    var conn = await $.hdb.getConnection();
    var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP FROM DUMMY';
    var currTstmpResult = await conn.executeQuery(currTimestampQuery);
    var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;

    var orderNumber = 0;
    var currDate = new Date(currTstmp);
    var currInvDate = new Date(inventory.MDATE);
    currInvDate.setHours(inventory.MTIME.getHours());
    var hoursDiff = Math.abs(currDate - currInvDate) / 3600000;
    var forecastLoop = hoursDiff + 120;
    var volToHitSFB = tankGrp.minHoursToReachSFB;
    var criticalTank = tankGrp.criticalTank;
    var hitSFBInPrevLoop = false;

    for (var x = 0; x < forecastLoop; x++) {
        var entry_type = 'FCT';
        var forecast_event = '';
        var critical_tank = 0;

        if (hitSFBInPrevLoop) {
            mquan += orderdetails.ORDERQTY + 500;
            hitSFBInPrevLoop = false;

            var insertOrderSQL = `
                INSERT INTO MY_ROICEAD_FORECASTCALCULATION (
                    CRTD_AT, CRTDBY, UPDT_AT, UPDTBY, SITE, TANKNUM, FORECASTDATE,
                    FORECASTTIME, ENTRY_TYPE, MATERIAL, TANKGRP, CRITICAL_TANK,
                    PROFILE_DAY, PROFILE_PHD, PROFILE, PROFILE_TYPE, FACTOR,
                    FORECASTQTY, FORECASTINV, FORECAST_EVT, FORECASTEDDATETIME
                ) VALUES (
                    '${currTstmp.toISOString()}', 'D.Pagonis', '${currTstmp.toISOString()}', 'D.Pagonis',
                    '${inventory.SITE}', '${inventory.TANKNUM}', '${Forecast.formatDate(currInvDate)}',
                    '${Forecast.formatTime(currInvDate)}', 'ORD', '${inventory.MATERIALID}', ' ',
                    ${critical_tank}, '', '', '', '', '', ${parseFloat(orderdetails.ORDERQTY)},
                    ${mquan}, '${forecast_event}', '${Forecast.formatDateTime(currInvDate)}'
                )
            `;
            await conn.executeUpdate(insertOrderSQL);
        }

        if (x === volToHitSFB) {
            var orderdetails = {
                SITE: inventory.SITE,
                TANKNUM: inventory.TANKNUM,
                ORDERQTY: parseFloat(tankdetails.TARLVL_VOL) - mquan,
                Suppl_Date: currInvDate,
                Suppl_Time: currInvDate,
                Cutoff_Date: currInvDate,
                orderNumber: orderNumber,
                MATERIALID: tankdetails.MATERIALID,
                MATERIALDESC: tankdetails.MATERIALDESC
            };

            if (inventory.TANKNUM === criticalTank) {
                critical_tank = 1;
            }

            volToHitSFB += tankGrp.minHoursToReachSFBAfterOrder;
            criticalTank = tankGrp.criticalTankAfterOrder;
            hitSFBInPrevLoop = true;

            if (Forecast.formatDate(currInvDate) >= Forecast.formatDate(currTstmp)) {
                replOrder.push(orderdetails);
                orderNumber++;
            }
        }

        if (mquan <= parseFloat(tankdetails.BTMSAF_VOL)) {
            forecast_event = 'SFB';
        }

        if (x === 0) {
            entry_type = 'SFCT';
        }

        currInvDate.setHours(currInvDate.getHours() + 1);

        if (x >= hoursDiff || x === 0) {
            var insertForecastSQL = `INSERT INTO MY_ROICEAD_FORECASTCALCULATION (
                    CRTD_AT, CRTDBY, UPDT_AT, UPDTBY, SITE, TANKNUM, FORECASTDATE,
                    FORECASTTIME, ENTRY_TYPE, MATERIAL, TANKGRP, CRITICAL_TANK,
                    PROFILE_DAY, PROFILE_PHD, PROFILE, PROFILE_TYPE, FACTOR,
                    FORECASTQTY, FORECASTINV, FORECAST_EVT, FORECASTEDDATETIME
                ) VALUES (
                    '${currTstmp.toISOString()}', 'D.Pagonis', '${currTstmp.toISOString()}', 'D.Pagonis',
                    '${inventory.SITE}', '${inventory.TANKNUM}', '${Forecast.formatDate(currInvDate)}',
                    '${Forecast.formatTime(currInvDate)}', '${entry_type}', '${inventory.MATERIALID}', ' ',
                    ${critical_tank}, '', '', '', '', '', 0.0, ${mquan}, '${forecast_event}',
                    '${Forecast.formatDateTime(currInvDate)}'
                )
            `;
            await conn.executeUpdate(insertForecastSQL);
        }

        mquan -= 500;
    }

    await conn.commit();
    await conn.close();
    return orderNumber + 1;
},

	saveInventoryInForecastTable: async function(inventories, tankdetails) {
		var conn = await $.hdb.getConnection();
		try {
			
			var currTstmpResult = await conn.executeQuery('SELECT CURRENT_TIMESTAMP FROM DUMMY');
			var currTstmp = Forecast.formatDateTime(currTstmpResult[0].CURRENT_TIMESTAMP);
			tankdetails.TANK_GRP = ' ';

			for (var x = 0; x < inventories.length; x++) {
				var currInvDate = new Date(inventories[x].MDATE);
				currInvDate.setHours(inventories[x].MTIME.getHours());
				currInvDate.setMinutes(inventories[x].MTIME.getMinutes());
				var currInvTime = new Date(inventories[x].MTIME);

				var sql = `INSERT INTO MY_ROICEAD_FORECASTCALCULATION VALUES(
					'${currTstmp}',                         /*CREATEDAT <TIMESTAMP>*/
					'D.Pagonis',                           /*CREATEDBY <NVARCHAR(255)>*/
					'${currTstmp}',                        /*MODIFIEDAT <TIMESTAMP>*/
					'D.Pagonis',                           /*MODIFIEDBY <NVARCHAR(255)>*/
					'${inventories[x].SITE}',              /*SITE <NVARCHAR(10)>*/
					'${inventories[x].TANKNUM}',           /*TANK <NVARCHAR(10)>*/
					'${Forecast.formatDate(currInvDate)}',             /*FORECAST_DATE <DATE>*/
					'${Forecast.formatTime(currInvTime)}',             /*FORECAST_TIME <TIME>*/
					'INV',                                 /*ENTRY_TYPE <NVARCHAR(10)>*/
					'${inventories[x].MATERIALID}',        /*MATERIAL <NVARCHAR(10)>*/
					'${tankdetails.TANK_GRP}',            /*TANK_GRP <NVARCHAR(10)>*/
					FALSE,                                     /*CRITICAL_TANK <BOOLEAN>*/
					'',                                    /*PROFILE_DAY <NVARCHAR(15)>*/
					'',                                    /*PROFILE_PHD <NVARCHAR(10)>*/
					'',                                    /*PROFILE <NVARCHAR(10)>*/
					'',                                    /*PROFILE_TYPE <NVARCHAR(10)>*/
					'',                                    /*FACTOR <NVARCHAR(6)>*/
					0.0,                                   /*FORECAST_QTY <DECIMAL>*/
					${inventories[x].MQUAN},              /*FORECAST_INV <DECIMAL>*/
					'',                                    /*FORECAST_EVT <NVARCHAR(5)>*/
					'${Forecast.formatDateTime(currInvDate)}'  /*FORECASTEDTIMESTAMP <TIMESTAMP>*/
				)`;
				console.log("sql saveInventoryInForecastTable " + sql)
				await conn.executeUpdate(sql);
			}
			await conn.commit();
		} catch (error) {
			await conn.rollback();
			throw error;
		} finally {
			await conn.close();
		}
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