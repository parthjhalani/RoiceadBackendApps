$.import("Reconciliation.xsjslib");
$.import("NetworkGraph.xsjslib");
$.import("TableUpdate.xsjslib");
$.import("MeterReadingAdjustment.xsjslib");
$.import("Forecast.xsjslib");
$.import("Forecast6Months.xsjslib");
$.import("ProposeOrder.xsjslib");
function getBPNumber() {
	
	var connectn =  ($.hdb.getConnection() );
	console.log(connectn);
	var query = 'SELECT getBPNumber.NEXTVAL FROM DUMMY';
	var result = connectn.executeQuery(query);
	var count = result[0]['GETBPNUMBER.NEXTVAL']._val;
	connectn.close(); //Close the  connections
	return count;
}
function getReplenishmentOrder() {
		var connectn = $.hdb.getConnection();
	var query = 'SELECT GETORDERNUMBER.NEXTVAL FROM DUMMY';
	var result = connectn.executeQuery(query);
	var count = result[0]['GETORDERNUMBER.NEXTVAL']._val;
	connectn.close(); //Close the  connections
	return count;
}
function getProfileNumber() {
		var connectn = $.hdb.getConnection();
	var query = 'SELECT GETPROFILENUMBER.NEXTVAL FROM DUMMY';
	var result = connectn.executeQuery(query);
	var count = result[0]['GETPROFILENUMBER.NEXTVAL']._val;
	connectn.close(); //Close the  connections
	return count;
}
function getReadingWithLastClosestRecord(date,site,meternum){
	var connectn = $.hdb.getConnection();
	var query = "SELECT * FROM MY_ROICEAD_METERREADINGS AS TI WHERE  TI.Site = '" + site + "' AND TI.METERNUM = '" + meternum + "' AND TI.MeasureDate =" +
                "(SELECT MAX(MeasureDate) FROM MY_ROICEAD_METERREADINGS  WHERE Site = '" + site + "' and MeterNum = '" + meternum + "' and MeasureDate <= '" + date + "')" ;
	var result = connectn.executeQuery(query);
	if(result[0]){
		result[0].newMeterID = getMeterInventoryID();
	}else{
		result = [];
		var pushdata = {
			"newMeterID" : getMeterInventoryID(),
			"MREADING" : "0.0"
		};
		result.push(pushdata);
	}
	connectn.close();
	return result ;
}
function getMetersWithLatestInventory(Site){
	var connectn = $.hdb.getConnection();
	/*var meterQuery = "select * from MY_ROICEAD_METERS AS METERS LEFT OUTER JOIN MY_ROICEAD_METEREADINGS AS TI ON METERS.SITE = TI.SITE AND METERS.METERNUM = TI.METERNUM WHERE " +
					"TI.MDATE = (SELECT MAX(TI.MDATE) FROM MY_ROICEAD_METEREADINGS AS TI WHERE  TI.Site = '" + Site +"' AND TI.METERNUM = METERS.METERNUM) ORDER BY TI.METERNUM,TI.MDATE, TI.MTIME DESC " ;*/
	var meterQuery = "Select * from MY_ROICEAD_METERS where SITE = '" + site + "' and status = 'ACTIVE'" ;
	var result = connectn.executeQuery(meterQuery);
	for(var i=0 ; i<result.length; i++){
		result[i].MaterialDesc = "";
		result[i].MaterialId=  "";
		result[i].MEASUREDATE = null;
		
		var inventoryQuery = "SELECT * FROM MY_ROICEAD_METERREADINGS AS TI WHERE  TI.Site = '" + Site +"'  AND TI.METERNUM = '" + result[i].METERNUM + 
							"' AND TI.MeasureDate = (SELECT MAX(MeasureDate) FROM MY_ROICEAD_METERREADINGS  WHERE Site = '" + Site + "' and MeterNum = '" + result[i].METERNUM  + "') " +
							" ORDER BY TI.METERNUM,TI.MeasureDate DESC "	;
		var inventoryRes = 	connectn.executeQuery(inventoryQuery);	
		var materialQuery = 'SELECT TOP 1 * FROM MY_ROICEAD_METERMATERIALALLOCATION WHERE Valid_from <= (SELECT CURRENT_DATE "current date" FROM DUMMY) and site = ' + 
							"'" + Site + "' and MeterNum = '" + result[i].METERNUM + "' ORDER BY Valid_from DESC" ;
		/*var materialQuery = 'SELECT * FROM MY_ROICEAD_MATERIALALLOCATION as MatAll  WHERE  site = '
							+ "'" + Site + "' and MeterNum = '" + result[i].METERNUM + "' ORDER BY Valid_from DESC" */
				
		var matRes = connectn.executeQuery(materialQuery);
		if(inventoryRes.length >= 1){
			result[i].MREADING = inventoryRes[inventoryRes.length - 1].MREADING;
			result[i].MEASUREDATE = inventoryRes[inventoryRes.length - 1].MEASUREDATE;
			//result[i].MFUOM = inventoryRes[inventoryRes.length - 1].MFUOM;
			result[i].MaterialId = inventoryRes[inventoryRes.length - 1].MATERIALID;
			result[i].MaterialDesc = inventoryRes[inventoryRes.length - 1].MATERIALDESC;
		}else{
			result[i].MREADING = "0.0";
		}
		if(matRes[0]){
			result[i].MaterialId= matRes[0].MATERIALID_MATERIALID;
			result[i].Valid_from = matRes[0].VALID_FROM;
		}
		if( result[i].MaterialId !== ""){
			var matDesc = "Select Top 1 materialid,  materialdesc from MY_ROICEAD_MATERIALS where materialid='"	+ result[i].MaterialId + "'";
			var matDscRes = connectn.executeQuery(matDesc);
			if(matDscRes[0]){
				result[i].MaterialDesc = matDscRes[0].MATERIALDESC;                      
			}
			
		}
	}
	connectn.close();
	return result;
}
function getTanksWithLatestInventory(Site){
	var connectn = $.hdb.getConnection();
	/*var tankQuery = "select * from MY_ROICEAD_TANKS AS TANKS LEFT OUTER JOIN MY_ROICEAD_TANKINVENTORY AS TI ON TANKS.SITE = TI.SITE AND TANKS.TANKNUM = TI.TANKNUM WHERE " +
					"TI.MDATE = (SELECT MAX(TI.MDATE) FROM MY_ROICEAD_TANKINVENTORY AS TI WHERE  TI.Site = '" + Site +"' AND TI.TANKNUM = TANKS.TANKNUM) ORDER BY TI.TANKNUM,TI.MDATE, TI.MTIME DESC " ;*/
	var tankQuery = "Select * from MY_ROICEAD_TANKS where SITE = '" + site + "' and status = 'ACTIVE'" ;
	var result = connectn.executeQuery(tankQuery);
	for(var i=0 ; i<result.length; i++){
		result[i].MaterialDesc = "";
		result[i].MaterialId=  "";
		result[i].MDATE = null;
		result[i].MTIME = null;
		var inventoryQuery = "select * from MY_ROICEAD_TANKINVENTORY AS TI WHERE  TI.Site = '" + Site +"' AND TI.TANKNUM = '" + result[i].TANKNUM + 
							"' AND TI.MDATE = (SELECT MAX(MDATE) FROM MY_ROICEAD_TANKINVENTORY  WHERE Site = '" + Site + "' and TankNum = '" + result[i].TANKNUM  + "') "	
							" ORDER BY TI.TANKNUM,TI.MDATE, TI.MTIME DESC "	;
		var inventoryRes = 	connectn.executeQuery(inventoryQuery);	
		var materialQuery = 'SELECT TOP 1 * FROM MY_ROICEAD_MATERIALALLOCATION WHERE Valid_from < (SELECT CURRENT_DATE "current date" FROM DUMMY) and site = ' + 
							"'" + Site + "' and TankNum = '" + result[i].TANKNUM + "' ORDER BY Valid_from DESC" ;
		/*var materialQuery = 'SELECT * FROM MY_ROICEAD_MATERIALALLOCATION as MatAll  WHERE  site = '
							+ "'" + Site + "' and TankNum = '" + result[i].TANKNUM + "' ORDER BY Valid_from DESC" */
				
		var matRes = connectn.executeQuery(materialQuery);
		if(inventoryRes.length >= 1){
			result[i].MQUAN = inventoryRes[inventoryRes.length - 1].MQUAN;
			result[i].MDATE = inventoryRes[inventoryRes.length - 1].MDATE;
			result[i].MTIME = inventoryRes[inventoryRes.length - 1].MTIME;
			result[i].MaterialId = inventoryRes[inventoryRes.length - 1].MATERIALID;
			result[i].MaterialDesc = inventoryRes[inventoryRes.length - 1].MATERIALDESC;
		}else{
			result[i].MQUAN = "0.0";
		}
		if(matRes[0]){
			result[i].MaterialId= matRes[0].MATERIALID_MATERIALID;
			result[i].Valid_from = matRes[0].VALID_FROM;
		}
		if( result[i].MaterialId !== ""){
			var matDesc = "Select Top 1 materialid,  materialdesc from MY_ROICEAD_MATERIALS where materialid='"	+ result[i].MaterialId + "'";
			var matDscRes = connectn.executeQuery(matDesc);
			if(matDscRes[0]){
				result[i].MaterialDesc = matDscRes[0].MATERIALDESC;                      
			}
			
		}
	}
	connectn.close();
	return result;
}
function arePointsNear(checkPoint, centerPoint, km) {
    var ky = 40000 / 360;
    var kx = Math.cos(Math.PI * centerPoint.lat / 180.0) * ky;
    var dx = Math.abs(centerPoint.lng - checkPoint.lng) * kx;
    var dy = Math.abs(centerPoint.lat - checkPoint.lat) * ky;
    var dist = Math.sqrt(dx * dx + dy * dy);
    return {
    	dist : dist,
    	isInRadius : dist <= km
    }	
}

function getAllSites(dist, centerPoint, prodId, comp){
	var connectn = $.hdb.getConnection();
	var blankval = '';
	var query = 'select SITES.SITE,SITES.ACRONYM,Material.MATERIALID_MATERIALID,SITES.STREET1,SITES.CITY,SITES.DISTRICT,SITES.ZIPCODE, ' +
				'SITES.LATITUDE, SITES.LONGITUDE, Material.TankNum FROM "MY_ROICEAD_SITEDETAILS" as Sites inner join "MY_ROICEAD_MATERIALALLOCATION" as  Material ' + 
				'on Sites.Site = Material.Site where  Sites.LATITUDE <> ' +
				"'' AND Sites.LONGITUDE <> '' AND Material.MATERIALID_MATERIALID = '" + prodId +
				 "' group by SITES.SITE, SITES.ACRONYM, Material.MATERIALID_MATERIALID, SITES.STREET1, SITES.CITY, SITES.DISTRICT, SITES.ZIPCODE, SITES.LATITUDE, SITES.LONGITUDE,Material.TankNum" +
				 " ORDER BY SITES.SITE";
	;
	var output = []
	var result = connectn.executeQuery(query);
	
	for(var i=0 ; i<result.length; i++){
		var checkPoint = { lat: result[i].LATITUDE, lng: result[i].LONGITUDE };
		var validation = arePointsNear(checkPoint, centerPoint, dist);
	 if (validation.isInRadius === true) {
	 	result[i].distance = validation.dist;
	 	var qtyQuery = 'select (Tanks.TARLVL_VOL - TI.MQUAN) AS FREE, TI.MQUOM, Tanks.TARLVL_VOL, Tanks.TOPSAFE_VOL, Tanks.BTMSAF_VOL, Tanks.UNPCAP_VOL, Tanks.ORDLVL_VOL, TI.MQUAN  from MY_ROICEAD_TANKS as Tanks inner join MY_ROICEAD_TANKINVENTORY as TI on Tanks.Site = TI.Site and Tanks.TankNum = TI.TankNum WHERE ' +
					"Tanks.TankNum = '" + result[i].TANKNUM + "' and Tanks.Site = '" + result[i].SITE + "' and " +
					"TI.MDATE = (SELECT MAX(MDATE) FROM MY_ROICEAD_TANKINVENTORY as TI WHERE TI.TankNum = '" + result[i].TANKNUM + "' and TI.Site ='" + result[i].SITE + "') ORDER BY MTIME DESC " ;
		var tankQty = connectn.executeQuery(qtyQuery);
		if(tankQty[0]){
			result[i].freeQty = tankQty[0].FREE + tankQty[0].MQUOM;
			result[i].TARLVL_VOL = tankQty[0].TARLVL_VOL ;
			result[i].TOPSAFE_VOL = tankQty[0].TOPSAFE_VOL ;
			result[i].BTMSAF_VOL = tankQty[0].BTMSAF_VOL ;
			result[i].UNPCAP_VOL = tankQty[0].UNPCAP_VOL ;
			result[i].ORDLVL_VOL = tankQty[0].ORDLVL_VOL ;
			result[i].MQUAN = tankQty[0].MQUAN ;
		}else{
			result[i].freeQty = '0.0';
		}
		output.push(result[i]);
	 }	
	}
	connectn.close();
	return output;
}
function getTankInventoryID() {
		var connectn = $.hdb.getConnection();
	var query = 'SELECT getTankInventoryID.NEXTVAL FROM DUMMY';
	var result = connectn.executeQuery(query);
	var count = result[0]['GETTANKINVENTORYID.NEXTVAL']._val;
	connectn.close(); //Close the  connections
	return count;
}
function getMeterInventoryID() {
		var connectn = $.hdb.getConnection();
	var query = 'SELECT getMeterInventoryID.NEXTVAL FROM DUMMY';
	var result = connectn.executeQuery(query);
	var count = result[0]['GETMETERINVENTORYID.NEXTVAL']._val;
	connectn.close(); //Close the  connections
	return count;
}
function getSiteNumber() {
		var connectn = $.hdb.getConnection();
	var query = 'SELECT getSiteNumber.NEXTVAL FROM DUMMY';
	var result = connectn.executeQuery(query);
	var count = result[0]['GETSITENUMBER.NEXTVAL']._val;
	connectn.close(); //Close the  connections
	return count;
}
function calcTotalDrawingsAmount() {
	var connectn = $.hdb.getConnection();
	
	var query = 'SELECT GROSSVALUE , IsInvoiced FROM "MY_ROICEAD_DRAWINGS"' ;
	var result = connectn.executeQuery(query);
	var amount = 0;	

	for(var i=0 ; i<result.length; i++){
	 if (result[i].ISINVOICED === false) 
		amount = amount + parseFloat(result[i].GROSSVALUE);
	}

	var output = {
		"d": {
			"icon": "sap-icon://mileage",
			"info": "",
			"infoState": "",
			"number": amount.toFixed(2),
			"numberDigits": 1,
			"numberFactor": "",
			"numberState": "Positive",
			"numberUnit": "EUR,Value",
			"stateArrow": "",
			"subtitle": "Drawings",
			"title": "Non-Invoiced"
		}
	}

/*	
	*/
	connectn.close(); //Close the  connections
	return output;
}
function calcTotalActiveCards(){
	var connectn = $.hdb.getConnection();
	var query = 'SELECT count(*) as count FROM "MY_ROICEAD_CARDS" where STATUS=' + "'Active'";
	var result = connectn.executeQuery(query);
	var count = result[0].COUNT._val;
	var output = {
		"d": {
			"icon": "sap-icon://action-settings",
			"info": "",
			"infoState": "",
			"number": count,
			"numberDigits": 1,
			"numberFactor": "",
			"numberState": "",
			"numberUnit": "Number",
			"stateArrow": "",
			"subtitle": "Active",
			"title": "Cards"
		}
	}

	
	
	connectn.close(); //Close the  connections
	return output;
}
function totalNumberOfBusinessPartners() {
	var connectn = $.hdb.getConnection();
	var query = 'SELECT count(*) as count FROM "MY_ROICEAD_BUSINESSPARTNER"';
	
	var result = connectn.executeQuery(query);
	var count = result[0].COUNT._val;
	var output = {
		"d": {
			"icon": "sap-icon://customer",
			"info": "",
			"infoState": "",
			"number": count,
			"numberDigits": 1,
			"numberFactor": "",
			"numberState": "",
			"numberUnit": "Personas",
			"stateArrow": "",
			"subtitle": "Account & Roles",
			"title": "Manage"
		}
	}

	
	
	connectn.close(); //Close the  connections
	return output;
}
function calcTotalNumberOfCards(){
	var connectn = $.hdb.getConnection();
	var query = 'SELECT count(*) as count FROM "MY_ROICEAD_CARDS"';
	
	var result = connectn.executeQuery(query);
	var count = result[0].COUNT._val;
	
	var output = {
		"d": {
			"icon": "sap-icon://action-settings",
			"info": "",
			"infoState": "",
			"number": count,
			"numberDigits": 1,
			"numberFactor": "",
			"numberState": "",
			"numberUnit": "Number",
			"stateArrow": "",
			"subtitle": "All",
			"title": "Cards"
		}
	}

	
	
	connectn.close(); //Close the  connections
	return output;
}
function totalNumberOfSites() {
	var connectn = $.hdb.getConnection();
	var query = 'SELECT count(*) as count FROM "MY_ROICEAD_SITEDETAILS"';
	
	var result = connectn.executeQuery(query);
	var count = result[0].COUNT._val;
	
	
	var output = {
		"d": {
			"icon": "sap-icon://action-settings",
			"info": "",
			"infoState": "",
			"number": count,
			"numberDigits": "",
			"numberFactor": "",
			"numberState": "",
			"numberUnit": "No. of Sites",
			"stateArrow": "",
			"subtitle": "Site Locations",
			"title": "Manage"
		}
	}

	
	
	connectn.close(); //Close the  connections
	return output;
}
function totalNumberOfTanks() {
	var connectn = $.hdb.getConnection();
	var query = 'SELECT count(*) as COUNT FROM "MY_ROICEAD_INVENTORYDATA1"';
	
	var result = connectn.executeQuery(query);
	var count = result[0].COUNT._val;
	
	
	var output = {
		"d": {
			"icon": "sap-icon://electrocardiogram",
			"info": "",
			"infoState": "",
			"number": count,
			"numberDigits": "",
			"numberFactor": "",
			"numberState": "",
			"numberUnit": "Tank(s)",
			"stateArrow": "",
			"subtitle": "Tank Inventory",
			"title": "Monitor"
		}
	}

	
	
	connectn.close(); //Close the  connections
	return output;
}

function countPendingInvoices() {
	var connectn = $.hdb.getConnection();
	var query = 'SELECT GROSSVALUE , IsInvoiced FROM "MY_ROICEAD_DRAWINGS" where IsInvoiced =' + 'false' ;
	var result = connectn.executeQuery(query);
	
	var count;
	if (result.length > 0) {
		count = result.length;
	} else {
		count = 0;
	}
	var output = {
		"d": {
			"icon": "sap-icon://mileage",
			"info": "",
			"infoState": "",
			"number": count,
			"numberDigits": 1,
			"numberFactor": "",
			"numberState": "",
			"numberUnit": "Transactions",
			"stateArrow": "",
			"subtitle": "Drawings",
			"title": "Non-Invoiced"
		}
	}

	
	
	connectn.close(); //Close the  connections
	return output;
}
function countDrawingsY2D() {
	var connectn = $.hdb.getConnection();
	var d = new Date(new Date().getFullYear(), 0, 1);
	var datey = d.getFullYear() + "-01-01" 
	var query = "SELECT count(*) as COUNT FROM MY_ROICEAD_DRAWINGS where TransactDate >= '" + datey + "'";
	var result = connectn.executeQuery(query);
	

		var count = result[0].COUNT._val;
	var output = {
		"d": {
			"icon": "sap-icon://activities",
			"info": "",
			"infoState": "",
			"number": count,
			"numberDigits": 1,
			"numberFactor": "",
			"numberState": "",
			"numberUnit": "Transactions",
			"stateArrow": "",
			"subtitle": "Year to Date",
			"title": "Drawings"
		}
	}

	
	
	connectn.close(); //Close the  connections
	return output;
}

try {
	var method = $.request.method;
	var output;
	if (method === $.net.http.POST) {
        console.log($.request.querystring)
		var content = $.request.body.asString();
        try{
            var record = JSON.parse(content);
            
            if(record.tablename){
                output = 	$.TableUpdate.updateTableRecords(content);
            }else{
                output = 	$.MeterReadingAdjustment.adjustMeterReading(content);
            }
            $.response.setBody(output);
        }
        catch(oErr){
            //output = 	$.MeterReadingAdjustment.adjustMeterReading(content);
            $.response.setBody("Error due to:" + oErr.message);
        }
	    
	}else
	{
	var countRequestedFor = $.request.parameters.get('countFor');
	
	if (countRequestedFor === "pendingInvoices") {
		output = countPendingInvoices();
	} else if (countRequestedFor === 'totalDrawingsAmount') {
		output = calcTotalDrawingsAmount();
	}else if (countRequestedFor === 'DrawingsY2D') {
		output = countDrawingsY2D();
	}
	else if (countRequestedFor === 'totalActiveCards') {
		output = calcTotalActiveCards();
	}else if (countRequestedFor === 'totalNumberOfTanks') {
		output = totalNumberOfTanks();
	}  else if (countRequestedFor === 'totalCards') {
		output = calcTotalNumberOfCards();
	} else if (countRequestedFor === 'totalBusinessPartner') {
		output = totalNumberOfBusinessPartners();
	} else if (countRequestedFor === 'totalSiteNumbers') {
		output = totalNumberOfSites();
	} else if (countRequestedFor === 'getBPNumber') {
		output = getBPNumber();
	}else if (countRequestedFor === 'getOrderNumber') {
		output = getReplenishmentOrder();
	}
	else if (countRequestedFor === 'getProfileNumber') {
		output = getProfileNumber();
	}
	
	else if (countRequestedFor === 'getSiteNumber') {
		output = getSiteNumber();
	}else if (countRequestedFor === 'getTankInventoryID') {
		output = getTankInventoryID();
	}else if (countRequestedFor === 'getReadingWithLastClosestRecord') {
		var site = $.request.parameters.get('site');
		var meternum = $.request.parameters.get('meternum');
		var date = $.request.parameters.get('date');
		output = getReadingWithLastClosestRecord(date,site,meternum);
	}
	
	else if (countRequestedFor === 'getMeterInventoryID') {
		output = getMeterInventoryID();
	}else if (countRequestedFor === 'getTanksWithLatestInventory') {
		var site = $.request.parameters.get('site');
		output = getTanksWithLatestInventory(site);
		output = JSON.stringify(output);
	}else if (countRequestedFor === 'getMetersWithLatestInventory') {
		var site = $.request.parameters.get('site');
		output = getMetersWithLatestInventory(site);
		output = JSON.stringify(output);
	}else if (countRequestedFor === 'getNearBySites') {
		var lat = $.request.parameters.get('lat');
		var long = $.request.parameters.get('long');
		var rad = $.request.parameters.get('radius');
		var prodID = $.request.parameters.get('prodId');
		var comp = $.request.parameters.get('comp');
		var centerPoint = { lat: lat, lng: long };
		rad = parseFloat(rad, [2]);
		output = getAllSites(rad, centerPoint, prodID, comp);
		output = JSON.stringify(output);
	}else if (countRequestedFor === 'getReconciliationID') {
		output = $.Reconciliation.getReconcNumber();
	}else if (countRequestedFor === 'reconciliation') {
		var site = $.request.parameters.get('site');
		var siteType = $.request.parameters.get('siteType');
		//var sObjectId =  sites.split(";");
		var tanks = $.request.parameters.get('tanks');
		
		var startDate = $.request.parameters.get('startDate');
		var endDate = $.request.parameters.get('endDate');
		var period = $.request.parameters.get('period');
		tanks = decodeURIComponent(tanks);
		var reconciliation = "" ;
		output = $.Reconciliation.getTanksWithReconciliation(site,tanks,startDate,endDate,siteType,period);
		output = JSON.stringify(output);
	}else if (countRequestedFor === 'getNetworkGraph') {
		output = $.NetworkGraph.getNetworkGraph();
		output = JSON.stringify(output);
	}else if (countRequestedFor === 'runForecast') {
		var site = $.request.parameters.get('site');
		var tanks = $.request.parameters.get('tanks');
		tanks = decodeURIComponent(tanks);
		output = $.Forecast.executeForecast(site,tanks);
		output = JSON.stringify(output);
	}else if (countRequestedFor === 'getForecastOrder') {
		var site = $.request.parameters.get('site');
		var tankgrp = $.request.parameters.get('tankgrp');
		output = $.ProposeOrder.getForecastOrder(site,tankgrp);
		output = JSON.stringify(output);
	}else if (countRequestedFor === 'runForecastFor6Months') {
		var sites = $.request.parameters.get('sites');
		
		sites = decodeURIComponent(sites);
		output = $.Forecast6Months.getSiteTanksAndExecuteForecast(sites);
		output = JSON.stringify(output);
	}
	
	

	$.response.setBody(output);
	}
} catch (err) {
	$.response.setBody("Error due to:" + err.message);
}