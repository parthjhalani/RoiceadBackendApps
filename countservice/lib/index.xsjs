const Reconciliation = await $.import("Reconciliation.xsjslib");
const NetworkGraph = await $.import("NetworkGraph.xsjslib");
const TableUpdate = await $.import("TableUpdate.xsjslib");
const MeterReadingAdjustment = await $.import("MeterReadingAdjustment.xsjslib");
const Forecast = await $.import("Forecast.xsjslib");
const Forecast6Months = await $.import("Forecast6Months.xsjslib");
const ProposeOrder = await $.import("ProposeOrder.xsjslib");
async function getBPNumber() {
	var connectn = await $.hdb.getConnection();
	var query = 'SELECT getBPNumber.NEXTVAL FROM DUMMY';
	var result = await connectn.executeQuery(query);
	var count = result[0]['GETBPNUMBER.NEXTVAL']._val;
	connectn.close(); //Close the  connections
	return count;
}

async function getReplenishmentOrder() {
	var connectn = await $.hdb.getConnection();
	var query = 'SELECT GETORDERNUMBER.NEXTVAL FROM DUMMY';
	var result = await connectn.executeQuery(query);
	var count = result[0]['GETORDERNUMBER.NEXTVAL']._val;
	connectn.close(); //Close the  connections
	return count;
}

async function getProfileNumber() {
	var connectn = await $.hdb.getConnection();
	var query = 'SELECT GETPROFILENUMBER.NEXTVAL FROM DUMMY';
	var result = await connectn.executeQuery(query);
	var count = result[0]['GETPROFILENUMBER.NEXTVAL']._val;
	connectn.close(); //Close the  connections
	return count;
}
async function getReadingWithLastClosestRecord(date, site, meternum) {
	var connectn = await $.hdb.getConnection();
	var query = "SELECT * FROM MY_ROICEAD_METERREADINGS AS TI WHERE  TI.Site = '" + site + "' AND TI.METERNUM = '" + meternum + "' AND TI.MeasureDate =" +
				"(SELECT MAX(MeasureDate) FROM MY_ROICEAD_METERREADINGS  WHERE Site = '" + site + "' and MeterNum = '" + meternum + "' and MeasureDate <= '" + date + "')";
	var result = await connectn.executeQuery(query);
	if (result[0]) {
		result[0].newMeterID = await getMeterInventoryID();
	} else {
		result = [];
		var pushdata = {
			"newMeterID": await getMeterInventoryID(),
			"MREADING": "0.0"
		};
		result.push(pushdata);
	}
	connectn.close();
	return result;
}
async function getMetersWithLatestInventory(Site) {
	var connectn = await $.hdb.getConnection();
	var meterQuery = "Select * from MY_ROICEAD_METERS where SITE = '" + Site + "' and status = 'ACTIVE'";
	var result = await connectn.executeQuery(meterQuery);
	for (var i = 0; i < result.length; i++) {
		result[i].MaterialDesc = "";
		result[i].MaterialId = "";
		result[i].MEASUREDATE = null;

		var inventoryQuery = "SELECT * FROM MY_ROICEAD_METERREADINGS AS TI WHERE TI.Site = '" + Site + "' AND TI.METERNUM = '" + result[i].METERNUM +
			"' AND TI.MeasureDate = (SELECT MAX(MeasureDate) FROM MY_ROICEAD_METERREADINGS WHERE Site = '" + Site + "' and MeterNum = '" + result[i].METERNUM + "') " +
			" ORDER BY TI.METERNUM,TI.MeasureDate DESC";
		var inventoryRes = await connectn.executeQuery(inventoryQuery);
		var materialQuery = 'SELECT TOP 1 * FROM MY_ROICEAD_METERMATERIALALLOCATION WHERE Valid_from <= (SELECT CURRENT_DATE "current date" FROM DUMMY) and site = ' +
			"'" + Site + "' and MeterNum = '" + result[i].METERNUM + "' ORDER BY Valid_from DESC";

		var matRes = await connectn.executeQuery(materialQuery);
		if (inventoryRes.length >= 1) {
			result[i].MREADING = inventoryRes[inventoryRes.length - 1].MREADING;
			result[i].MEASUREDATE = inventoryRes[inventoryRes.length - 1].MEASUREDATE;
			result[i].MaterialId = inventoryRes[inventoryRes.length - 1].MATERIALID;
			result[i].MaterialDesc = inventoryRes[inventoryRes.length - 1].MATERIALDESC;
		} else {
			result[i].MREADING = "0.0";
		}
		if (matRes[0]) {
			result[i].MaterialId = matRes[0].MATERIALID_MATERIALID;
			result[i].Valid_from = matRes[0].VALID_FROM;
		}
		if (result[i].MaterialId !== "") {
			var matDesc = "Select Top 1 materialid, materialdesc from MY_ROICEAD_MATERIALS where materialid='" + result[i].MaterialId + "'";
			var matDscRes = await connectn.executeQuery(matDesc);
			if (matDscRes[0]) {
				result[i].MaterialDesc = matDscRes[0].MATERIALDESC;
			}
		}
	}
	connectn.close();
	return result;
}
async function getTanksWithLatestInventory(Site) {
	var connectn = await $.hdb.getConnection();
	var tankQuery = "Select * from MY_ROICEAD_TANKS where SITE = '" + Site + "' and status = 'ACTIVE'";
	var result = await connectn.executeQuery(tankQuery);
	for (var i = 0; i < result.length; i++) {
		result[i].MaterialDesc = "";
		result[i].MaterialId = "";
		result[i].MDATE = null;
		result[i].MTIME = null;
		var inventoryQuery = "select * from MY_ROICEAD_TANKINVENTORY AS TI WHERE  TI.Site = '" + Site + "' AND TI.TANKNUM = '" + result[i].TANKNUM +
			"' AND TI.MDATE = (SELECT MAX(MDATE) FROM MY_ROICEAD_TANKINVENTORY  WHERE Site = '" + Site + "' and TankNum = '" + result[i].TANKNUM + "') " +
			" ORDER BY TI.TANKNUM,TI.MDATE, TI.MTIME DESC";
		var inventoryRes = await connectn.executeQuery(inventoryQuery);
		var materialQuery = 'SELECT TOP 1 * FROM MY_ROICEAD_MATERIALALLOCATION WHERE Valid_from < (SELECT CURRENT_DATE "current date" FROM DUMMY) and site = ' +
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
			var matDesc = "Select Top 1 materialid, materialdesc from MY_ROICEAD_MATERIALS where materialid='" + result[i].MaterialId + "'";
			var matDscRes = await connectn.executeQuery(matDesc);
			if (matDscRes[0]) {
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
async function getAllSites(dist, centerPoint, prodId, comp) {
	var connectn = await $.hdb.getConnection();
	var blankval = '';
	var query = 'select SITES.SITE,SITES.ACRONYM,Material.MATERIALID_MATERIALID,SITES.STREET1,SITES.CITY,SITES.DISTRICT,SITES.ZIPCODE, ' +
				'SITES.LATITUDE, SITES.LONGITUDE, Material.TankNum FROM "MY_ROICEAD_SITEDETAILS" as Sites inner join "MY_ROICEAD_MATERIALALLOCATION" as  Material ' + 
				'on Sites.Site = Material.Site where  Sites.LATITUDE <> ' +
				"'' AND Sites.LONGITUDE <> '' AND Material.MATERIALID_MATERIALID = '" + prodId +
				 "' group by SITES.SITE, SITES.ACRONYM, Material.MATERIALID_MATERIALID, SITES.STREET1, SITES.CITY, SITES.DISTRICT, SITES.ZIPCODE, SITES.LATITUDE, SITES.LONGITUDE,Material.TankNum" +
				 " ORDER BY SITES.SITE";
	var output = [];
	var result = await connectn.executeQuery(query);
	
	for (var i = 0; i < result.length; i++) {
		var checkPoint = { lat: result[i].LATITUDE, lng: result[i].LONGITUDE };
		var validation = arePointsNear(checkPoint, centerPoint, dist);
		if (validation.isInRadius === true) {
			result[i].distance = validation.dist;
			var qtyQuery = 'select (Tanks.TARLVL_VOL - TI.MQUAN) AS FREE, TI.MQUOM, Tanks.TARLVL_VOL, Tanks.TOPSAFE_VOL, Tanks.BTMSAF_VOL, Tanks.UNPCAP_VOL, Tanks.ORDLVL_VOL, TI.MQUAN  from MY_ROICEAD_TANKS as Tanks inner join MY_ROICEAD_TANKINVENTORY as TI on Tanks.Site = TI.Site and Tanks.TankNum = TI.TankNum WHERE ' +
					"Tanks.TankNum = '" + result[i].TANKNUM + "' and Tanks.Site = '" + result[i].SITE + "' and " +
					"TI.MDATE = (SELECT MAX(MDATE) FROM MY_ROICEAD_TANKINVENTORY as TI WHERE TI.TankNum = '" + result[i].TANKNUM + "' and TI.Site ='" + result[i].SITE + "') ORDER BY MTIME DESC";
			var tankQty = await connectn.executeQuery(qtyQuery);
			if (tankQty[0]) {
				result[i].freeQty = tankQty[0].FREE + tankQty[0].MQUOM;
				result[i].TARLVL_VOL = tankQty[0].TARLVL_VOL;
				result[i].TOPSAFE_VOL = tankQty[0].TOPSAFE_VOL;
				result[i].BTMSAF_VOL = tankQty[0].BTMSAF_VOL;
				result[i].UNPCAP_VOL = tankQty[0].UNPCAP_VOL;
				result[i].ORDLVL_VOL = tankQty[0].ORDLVL_VOL;
				result[i].MQUAN = tankQty[0].MQUAN;
			} else {
				result[i].freeQty = '0.0';
			}
			output.push(result[i]);
		}
	}
	connectn.close();
	return output;
}
async function getTankInventoryID() {
	
	var connectn = await $.hdb.getConnection();
	var query = 'SELECT getTankInventoryID.NEXTVAL FROM DUMMY';
	var result = await connectn.executeQuery(query);
	var count = result[0]['GETTANKINVENTORYID.NEXTVAL']._val;
	connectn.close(); //Close the connections
	return count;
}
async function getMeterInventoryID() {
	var connectn = await $.hdb.getConnection();
	var query = 'SELECT getMeterInventoryID.NEXTVAL FROM DUMMY';
	var result = await connectn.executeQuery(query);
	var count = result[0]['GETMETERINVENTORYID.NEXTVAL']._val;
	connectn.close(); //Close the connections
	return count;
}
async function getSiteNumber() {
	var connectn = await $.hdb.getConnection();
	var query = 'SELECT getSiteNumber.NEXTVAL FROM DUMMY';
	var result = await connectn.executeQuery(query);
	var count = result[0]['GETSITENUMBER.NEXTVAL']._val;
	connectn.close(); //Close the connections
	return count;
}
async function calcTotalDrawingsAmount() {
	var connectn = await $.hdb.getConnection();
	
	var query = 'SELECT GROSSVALUE , IsInvoiced FROM "MY_ROICEAD_DRAWINGS"' ;
	var result = await connectn.executeQuery(query);
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

	connectn.close(); //Close the  connections
	return output;
}
async function calcTotalActiveCards() {
	
	var connectn = await $.hdb.getConnection();
	var query = 'SELECT count(*) as count FROM "MY_ROICEAD_CARDS" where STATUS=' + "'Active'";
	var result = await connectn.executeQuery(query);
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

	connectn.close(); //Close the connections
	return output;
}
async function totalNumberOfBusinessPartners() {
	var connectn = await $.hdb.getConnection();
	var query = 'SELECT count(*) as count FROM "MY_ROICEAD_BUSINESSPARTNER"';
	var result = await connectn.executeQuery(query);
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

	connectn.close(); //Close the connections
	return output;
}
async function calcTotalNumberOfCards() {
	
	var connectn = await $.hdb.getConnection();
	var query = 'SELECT count(*) as count FROM "MY_ROICEAD_CARDS"';
	
	var result = await connectn.executeQuery(query);
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

	connectn.close(); //Close the connections
	return output;
}

async function totalNumberOfSites() {
	var connectn = await $.hdb.getConnection();
	var query = 'SELECT count(*) as count FROM "MY_ROICEAD_SITEDETAILS"';
	
	var result = await connectn.executeQuery(query);
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

	connectn.close(); //Close the connections
	return output;
}
async function totalNumberOfTanks() {
	var connectn = await $.hdb.getConnection();
	var query = 'SELECT count(*) as COUNT FROM "MY_ROICEAD_INVENTORYDATA1"';
	
	var result = await connectn.executeQuery(query);
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
async function countPendingInvoices() {
	var connectn = await $.hdb.getConnection();
	var query = 'SELECT GROSSVALUE , IsInvoiced FROM "MY_ROICEAD_DRAWINGS" where IsInvoiced =' + 'false';
	var result = await connectn.executeQuery(query);
	
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

	connectn.close(); //Close the connections
	return output;
}
async function countDrawingsY2D() {
	var connectn = await $.hdb.getConnection();
	var d = new Date(new Date().getFullYear(), 0, 1);
	var datey = d.getFullYear() + "-01-01";
	var query = "SELECT count(*) as COUNT FROM MY_ROICEAD_DRAWINGS where TransactDate >= '" + datey + "'";
	var result = await connectn.executeQuery(query);

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

	connectn.close(); //Close the connections
	return output;
}
try {
  var method = $.request.method;
  var output;
  if (method === $.net.http.POST) {
    console.log($.request.querystring);
    var content = $.request.body.asString();

    try {
      var record = JSON.parse(content);
      
      if (record.tablename) {
        output = await $.TableUpdate.updateTableRecords(content);
      } else {
        output = await $.MeterReadingAdjustment.adjustMeterReading(content);
      }
      $.response.setBody(output);
    } catch (oErr) {
      $.response.setBody("Error due to:" + oErr.message);
    }
  } else {
    var countRequestedFor = $.request.parameters.get('countFor');

    switch (countRequestedFor) {
      case "pendingInvoices":
        output = await countPendingInvoices();
        break;
      case 'totalDrawingsAmount':
        output = await calcTotalDrawingsAmount();
        break;
      case 'DrawingsY2D':
        output = await countDrawingsY2D();
        break;
      case 'totalActiveCards':
        output = await calcTotalActiveCards();
        break;
      case 'totalNumberOfTanks':
        output = await totalNumberOfTanks();
        break;
      case 'totalCards':
        output = await calcTotalNumberOfCards();
        break;
      case 'totalBusinessPartner':
        output = await totalNumberOfBusinessPartners();
        break;
      case 'totalSiteNumbers':
        output = await totalNumberOfSites();
        break;
      case 'getBPNumber':
        output = await getBPNumber();
        break;
      case 'getOrderNumber':
        output = await getReplenishmentOrder();
        break;
      case 'getProfileNumber':
        output = await getProfileNumber();
        break;
      case 'getSiteNumber':
        output = await getSiteNumber();
        break;
      case 'getTankInventoryID':
        output = await getTankInventoryID();
        break;
      case 'getReadingWithLastClosestRecord':
        const siteReading = $.request.parameters.get('site');
        const meternum = $.request.parameters.get('meternum');
        const date = $.request.parameters.get('date');
        output = await getReadingWithLastClosestRecord(date, siteReading, meternum);
        break;
      case 'getMeterInventoryID':
        output = await getMeterInventoryID();
        break;
      case 'getTanksWithLatestInventory':
        const tanksInventory = $.request.parameters.get('site');
        output = await getTanksWithLatestInventory(tanksInventory);
        output = JSON.stringify(output);
        break;
      case 'getMetersWithLatestInventory':
        const metersLatestInv = $.request.parameters.get('site');
        output = await getMetersWithLatestInventory(metersLatestInv);
        output = JSON.stringify(output);
        break;
      case 'getNearBySites':
        const lat = $.request.parameters.get('lat');
        const long = $.request.parameters.get('long');
        const rad = $.request.parameters.get('radius');
        const prodID = $.request.parameters.get('prodId');
        const comp = $.request.parameters.get('comp');
        const centerPoint = { lat: lat, lng: long };
        const radius = parseFloat(rad, [2]);
        output = await getAllSites(radius, centerPoint, prodID, comp);
        output = JSON.stringify(output);
        break;
      case 'getReconciliationID':
        output = await Reconciliation.getReconcNumber();
        break;
      case 'reconciliation':
        const reconciliationS = $.request.parameters.get('site');
        const siteType = $.request.parameters.get('siteType');
        const tanksReconcile = $.request.parameters.get('tanks');
        const startDate = $.request.parameters.get('startDate');
        const endDate = $.request.parameters.get('endDate');
        const period = $.request.parameters.get('period');
        const decodedTanks = decodeURIComponent(tanksReconcile);
        output = await Reconciliation.getTanksWithReconciliation(reconciliationS, decodedTanks, startDate, endDate, siteType, period);
        output = JSON.stringify(output);
        break;
      case 'getNetworkGraph':
        output = await NetworkGraph.getNetworkGraph();
        output = JSON.stringify(output);
        break;
      case 'runForecast':
        const forecastRun = $.request.parameters.get('site');
        const tanks = $.request.parameters.get('tanks');
        const decodedForecastTanks = decodeURIComponent(tanks);
        output = await Forecast.executeForecast(forecastRun, decodedForecastTanks);
        output = JSON.stringify(output);
        break;
      case 'getForecastOrder':
        const forecastOrd = $.request.parameters.get('site');
        const tankgrp = $.request.parameters.get('tankgrp');
        output = await ProposeOrder.getForecastOrder(forecastOrd, tankgrp);
        output = JSON.stringify(output);
        break;
      case 'runForecastFor6Months':
        const sites = $.request.parameters.get('sites');
        const decodedSites = decodeURIComponent(sites);
        output = await Forecast6Months.getSiteTanksAndExecuteForecast(decodedSites);
        output = JSON.stringify(output);
        break;
      default:
        output = "Invalid countRequestedFor parameter";
        break;
    }
    
    await $.response.setBody(output);
  }
} catch (err) {
  console.log(err.message);
  $.response.setBody("Error due to:" + err.message);
}