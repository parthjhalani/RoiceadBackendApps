var connectn = await $.hdb.getConnection();
var ProposeOrder = {
getForecastOrder : async function (site,tankgrp) {
	
		var tankDetails = await ProposeOrder.getSiteTankDetails(site,tankgrp);	
		var lastInventory = await ProposeOrder.getTanksWithLatestInventory(site,tankgrp);
		
		for (var i = 0; i < tankDetails.length; i++) {
			for(var j=0; j<lastInventory.length ; j++){
				if(lastInventory[j].TANKNUM === tankDetails[i].TANKNUM){
					tankDetails[i].MQUAN = lastInventory[j]	.MQUAN;
					tankDetails[i].MATERIALID = lastInventory[j].MaterialId;
					tankDetails[i].MATERIALDESC = lastInventory[j].MaterialDesc;
					tankDetails[i].MDATE = lastInventory[j].MDATE;
					tankDetails[i].MTIME = lastInventory[j].MTIME;
					var currInvDate = new Date(lastInventory[j].MDATE);
					tankDetails[i].currInvDate = new Date(currInvDate.setHours(lastInventory[j].MTIME.getHours()));
				break;
					
				}			
			}
			
		}
		var forecastOrderDetails = await ProposeOrder.getForecastOrderDetail(tankDetails);
		if(forecastOrderDetails.length > 0){
			var orderno = await ProposeOrder.getReplenishmentOrder();
			for(var i=0;i<forecastOrderDetails.length;i++){
				forecastOrderDetails[i].OrderNo = orderno;
			}
		}
		return forecastOrderDetails;
},
getReplenishmentOrder : async function () {
		var connectn = await $.hdb.getConnection();
	var query = 'SELECT GETORDERNUMBER.NEXTVAL FROM DUMMY';
	var result = await connectn.executeQuery(query);
	var count = result[0]['GETORDERNUMBER.NEXTVAL']._val;
	connectn.close(); //Close the  connections
	return count;
},
getForecastOrderDetail : async function (tankinfo){
	var conn = await $.hdb.getConnection();
		
		var orderNumber = 0;
		var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = currTstmpResult[0].CURRENT_TIMESTAMP;
		var hitSFBInPrevLoop = false;
		var stopForecast = false;
		var replOrder = [];
		var x = 0;
		while(!stopForecast){
		for(var i=0;i<tankinfo.length;i++){
			var tankdetails = tankinfo[i];
			if (hitSFBInPrevLoop === x) {
				var orderdetails = {};
				var curInvDateT = new Date(tankdetails.currInvDate.setHours(tankdetails.currInvDate.getHours() ));
				orderdetails = {
					"SITE": tankdetails.SITE,
					"TANKNUM": tankdetails.TANKNUM,
					"ORDERQTY": (parseFloat(tankdetails.TARLVL_VOL) - (tankdetails.MQUAN  )  ) + "",
					"Suppl_Date": curInvDateT,//tankdetails.currInvDate,
					"Suppl_Time": curInvDateT,
					"Cutoff_Date": curInvDateT, //calculateCutOffDate
					"MQUAN" : parseFloat(tankdetails.TARLVL_VOL),
					"MATERIALID": tankdetails.MATERIALID,
					"MATERIALDESC": tankdetails.MATERIALDESC

				}
				if (ProposeOrder.formatDate(tankdetails.currInvDate) >= ProposeOrder.formatDate(currTstmp) ) {
					replOrder.push(orderdetails);
					//orderNumber = orderNumber + 1;
				}
				tankdetails.MQUAN = tankdetails.MQUAN + orderdetails.ORDERQTY ;
			}//HitSFBCondition
			tankdetails.currInvDate = new Date(tankdetails.currInvDate.setHours(tankdetails.currInvDate.getHours() + 1));
			if (tankdetails.MQUAN <= parseFloat(tankdetails.BTMSAF_VOL)) {
				
				critical_tank = 1;
				hitSFBInPrevLoop = x + 1;
				if (ProposeOrder.formatDate(tankdetails.currInvDate) >= ProposeOrder.ProposeOrder.formatDate(currTstmp)) {
					
					orderNumber = orderNumber + 1;
				}
				

			}
			tankdetails.MQUAN = tankdetails.MQUAN - 500;
		}// Tank Loop
			if (hitSFBInPrevLoop === x) {
				stopForecast = true;	
			}else{
				x = x + 1;
			}
		}//While Loop
		if(replOrder.length > 0){
			return replOrder;
		}else{
			return "Please enter the latest Tank Inventory and Retry";
		}
},
formatDate : function (date) {
		var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();

		var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);

		return (date.getFullYear() + "-" + MM + "-" + dd + "T00:00:00");
	},
getSiteTankDetails : async function (site,tankgrp) {
		var tankgrpcond = '';
			if(tankgrp === "null"){
			tankgrpcond = "and tank_grp is NULL";
			}else{
				tankgrpcond = "and tank_grp = '" + tankgrp + "'";
			}
		var getTankDetailsQuery = "SELECT * FROM MY_ROICEAD_TANKS where site = '" + site + "' " + tankgrpcond + " order by tank_grp";
		var tankdetails = await connectn.executeQuery(getTankDetailsQuery);
		return tankdetails;
	},
getTanksWithLatestInventory : async function (Site,tankgrp) {
		var connectn = await $.hdb.getConnection();
		var tankgrpcond = '';
			if(tankgrp === "null"){
			tankgrpcond = "and tank_grp is NULL";
			}else{
				tankgrpcond = "and tank_grp = '" + tankgrp + "'";
			}
		/*var tankQuery = "select * from MY_ROICEAD_TANKS AS TANKS LEFT OUTER JOIN MY_ROICEAD_TANKINVENTORY AS TI ON TANKS.SITE = TI.SITE AND TANKS.TANKNUM = TI.TANKNUM WHERE " +
						"TI.MDATE = (SELECT MAX(TI.MDATE) FROM MY_ROICEAD_TANKINVENTORY AS TI WHERE  TI.Site = '" + Site +"' AND TI.TANKNUM = TANKS.TANKNUM) ORDER BY TI.TANKNUM,TI.MDATE, TI.MTIME DESC " ;*/
		var tankQuery = "Select * from MY_ROICEAD_TANKS where SITE = '" + Site + "' " + tankgrpcond + " and status = 'ACTIVE'";
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
		connectn.close();
		return result;
	}
}
export default ProposeOrder;
	