$.import("Reconciliation.xsjslib");
$.import("NetworkGraph.xsjslib");
$.import("TableUpdate.xsjslib");
$.import("MeterReadingAdjustment.xsjslib");
$.import("Forecast.xsjslib");
$.import("Forecast6Months.xsjslib");
$.import("ProposeOrder.xsjslib");

async function getBPNumber() {
    var connectn = await $.hdb.getConnection();
    console.log(connectn);
    var query = 'SELECT getBPNumber.NEXTVAL FROM DUMMY';
    var result = await connectn.executeQuery(query);
    var count = result[0]['GETBPNUMBER.NEXTVAL']._val;
    connectn.close(); //Close the connections
    return count;
}

async function getReplenishmentOrder() {
    var connectn = await $.hdb.getConnection();
    var query = 'SELECT GETORDERNUMBER.NEXTVAL FROM DUMMY';
    var result = await connectn.executeQuery(query);
    var count = result[0]['GETORDERNUMBER.NEXTVAL']._val;
    connectn.close(); //Close the connections
    return count;
}

async function getProfileNumber() {
    var connectn = await $.hdb.getConnection();
    var query = 'SELECT GETPROFILENUMBER.NEXTVAL FROM DUMMY';
    var result = await connectn.executeQuery(query);
    var count = result[0]['GETPROFILENUMBER.NEXTVAL']._val;
    connectn.close(); //Close the connections
    return count;
}

async function getReadingWithLastClosestRecord(date, site, meternum) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_METERREADINGS AS TI WHERE  TI.Site = '" + site + "' AND TI.METERNUM = '" + meternum + "' AND TI.MeasureDate =" +
        "(SELECT MAX(MeasureDate) FROM MY_ROICEAD_METERREADINGS  WHERE Site = '" + site + "' and MeterNum = '" + meternum + "' and MeasureDate <= '" + date + "')";
    var result = await connectn.executeQuery(query);
    if (result[0]) {
        result[0].newMeterID = getMeterInventoryID();
    } else {
        result = [];
        var pushdata = {
            "newMeterID": getMeterInventoryID(),
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

        var inventoryQuery = "SELECT * FROM MY_ROICEAD_METERREADINGS AS TI WHERE  TI.Site = '" + Site + "'  AND TI.METERNUM = '" + result[i].METERNUM +
            "' AND TI.MeasureDate = (SELECT MAX(MeasureDate) FROM MY_ROICEAD_METERREADINGS  WHERE Site = '" + Site + "' and MeterNum = '" + result[i].METERNUM + "') " +
            " ORDER BY TI.METERNUM,TI.MeasureDate DESC ";
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

async function getTanksWithLatestInventory(Site) {
    var connectn = await $.hdb.getConnection();
    var tankQuery = "Select * from MY_ROICEAD_TANKS where SITE = '" + Site + "' and status = 'ACTIVE'";
    var result = await connectn.executeQuery(tankQuery);
    for (var i = 0; i < result.length; i++) {
        result[i].MaterialDesc = "";
        result[i].MaterialId = "";
        result[i].MDATE = null;
        result[i].MTIME = null;

        var inventoryQuery = "SELECT * FROM MY_ROICEAD_TANKINVENTORY AS TI WHERE  TI.Site = '" + Site + "' AND TI.TANKNUM = '" + result[i].TANKNUM +
            "' AND TI.DATETIME = (SELECT MAX(DATETIME) FROM MY_ROICEAD_TANKINVENTORY  WHERE Site = '" + Site + "' and TANKNUM = '" + result[i].TANKNUM + "')";
        var inventoryRes = await connectn.executeQuery(inventoryQuery);
        var materialQuery = 'SELECT TOP 1 * FROM MY_ROICEAD_TANKMATERIALALLOCATION WHERE Valid_from <= (SELECT CURRENT_DATE "current date" FROM DUMMY) and site = ' +
            "'" + Site + "' and TankNum = '" + result[i].TANKNUM + "' ORDER BY Valid_from DESC";
        var matRes = await connectn.executeQuery(materialQuery);
        if (inventoryRes.length >= 1) {
            result[i].Quantity = inventoryRes[inventoryRes.length - 1].QUANTITY;
            result[i].MDATE = inventoryRes[inventoryRes.length - 1].DATE;
            result[i].MTIME = inventoryRes[inventoryRes.length - 1].TIME;
            result[i].MaterialId = inventoryRes[inventoryRes.length - 1].MATERIALID;
            result[i].MaterialDesc = inventoryRes[inventoryRes.length - 1].MATERIALDESC;
        } else {
            result[i].Quantity = "0.0";
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

async function getMeterInventoryID() {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT 'METER' || RIGHT('00000' ||  GETINVENTORYNUMBER.NEXTVAL, 5) FROM DUMMY";
    var result = await connectn.executeQuery(query);
    var count = result[0]['METER' || RIGHT('00000' || 'GETINVENTORYNUMBER.NEXTVAL', 5)];
    connectn.close(); //Close the connections
    return count;
}

async function getTankInventoryID() {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT 'TANK' || RIGHT('00000' ||  GETINVENTORYNUMBER.NEXTVAL, 5) FROM DUMMY";
    var result = await connectn.executeQuery(query);
    var count = result[0]['TANK' || RIGHT('00000' || 'GETINVENTORYNUMBER.NEXTVAL', 5)];
    connectn.close(); //Close the connections
    return count;
}

async function getMeterReadingWithDateRange(date, site, meternum, startdate, enddate) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_METERREADINGS AS TI WHERE  TI.Site = '" + site + "' AND TI.METERNUM = '" + meternum + "' AND TI.MeasureDate >= '" + startdate +
        "' AND TI.MeasureDate <= '" + enddate + "'";
    var result = await connectn.executeQuery(query);
    if (result[0]) {
        result[0].newMeterID = getMeterInventoryID();
    } else {
        result = [];
        var pushdata = {
            "newMeterID": getMeterInventoryID(),
            "MREADING": "0.0"
        };
        result.push(pushdata);
    }
    connectn.close();
    return result;
}

async function getMeterReadingWithLastClosestRecord(date, site, meternum) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_METERREADINGS AS TI WHERE  TI.Site = '" + site + "' AND TI.METERNUM = '" + meternum + "' AND TI.MeasureDate =" +
        "(SELECT MAX(MeasureDate) FROM MY_ROICEAD_METERREADINGS  WHERE Site = '" + site + "' and MeterNum = '" + meternum + "' and MeasureDate <= '" + date + "')";
    var result = await connectn.executeQuery(query);
    if (result[0]) {
        result[0].newMeterID = getMeterInventoryID();
    } else {
        result = [];
        var pushdata = {
            "newMeterID": getMeterInventoryID(),
            "MREADING": "0.0"
        };
        result.push(pushdata);
    }
    connectn.close();
    return result;
}

async function getReconciliationData(startdate, enddate) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_RECONCILIATION WHERE DATE BETWEEN '" + startdate + "' AND '" + enddate + "'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getReconciliationSummaryData(startdate, enddate) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT SITE, COUNT(DISTINCT ID) as Reconciliations, SUM(POSITIVEVARIANCE) as PositiveVariance, SUM(NEGATIVEVARIANCE) as NegativeVariance, SUM(TOTALRECONCILEDVOLUME) as TotalReconciledVolume " +
        "FROM MY_ROICEAD_RECONCILIATION WHERE DATE BETWEEN '" + startdate + "' AND '" + enddate + "' GROUP BY SITE";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getMeterDataWithID(Site, meterNum) {
    var connectn = await $.hdb.getConnection();
    var query = "Select * from MY_ROICEAD_METERS where SITE = '" + Site + "' and METERNUM = '" + meterNum + "'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getTankDataWithID(Site, tankNum) {
    var connectn = await $.hdb.getConnection();
    var query = "Select * from MY_ROICEAD_TANKS where SITE = '" + Site + "' and TANKNUM = '" + tankNum + "'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getMaterials() {
    var connectn = await $.hdb.getConnection();
    var query = "Select * from MY_ROICEAD_MATERIALS";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getMaterialDataWithID(materialId) {
    var connectn = await $.hdb.getConnection();
    var query = "Select * from MY_ROICEAD_MATERIALS where MATERIALID = '" + materialId + "'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getOrders(site, startDate, endDate) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_ORDERS WHERE SITE = '" + site + "' AND ORDERDATE BETWEEN '" + startDate + "' AND '" + endDate + "'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getOrdersWithID(site, orderNum) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_ORDERS WHERE SITE = '" + site + "' AND ORDERNUM = '" + orderNum + "'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getOrdersByType(site, type, startDate, endDate) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_ORDERS WHERE SITE = '" + site + "' AND ORDERTYPE = '" + type + "' AND ORDERDATE BETWEEN '" + startDate + "' AND '" + endDate + "'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getOrdersByTypeWithID(site, type, orderNum) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_ORDERS WHERE SITE = '" + site + "' AND ORDERTYPE = '" + type + "' AND ORDERNUM = '" + orderNum + "'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getOpenOrders(site) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_ORDERS WHERE SITE = '" + site + "' AND ORDERSTATUS = 'OPEN'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getOpenOrdersByType(site, type) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_ORDERS WHERE SITE = '" + site + "' AND ORDERTYPE = '" + type + "' AND ORDERSTATUS = 'OPEN'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getClosedOrders(site) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_ORDERS WHERE SITE = '" + site + "' AND ORDERSTATUS = 'CLOSED'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getClosedOrdersByType(site, type) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_ORDERS WHERE SITE = '" + site + "' AND ORDERTYPE = '" + type + "' AND ORDERSTATUS = 'CLOSED'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getNetworkGraphData() {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_NETWORKGRAPH";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getDemandForecast(Site, MeterNum, Month, Year) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_FORECAST WHERE SITE = '" + Site + "' AND METER_NUM = '" + MeterNum + "' AND MONTH = '" + Month + "' AND YEAR = '" + Year + "'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getSixMonthsDemandForecast(Site, MeterNum, StartMonth, StartYear, EndMonth, EndYear) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_FORECAST WHERE SITE = '" + Site + "' AND METER_NUM = '" + MeterNum +
        "' AND (YEAR = '" + StartYear + "' AND MONTH >= '" + StartMonth + "') OR (YEAR = '" + EndYear + "' AND MONTH <= '" + EndMonth + "')";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getConsumptionForecast(Site, StartDate, EndDate) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_CONSUMPTIONFORECAST WHERE SITE = '" + Site + "' AND FORECASTDATE BETWEEN '" + StartDate + "' AND '" + EndDate + "'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function getSixMonthsConsumptionForecast(Site, StartDate, EndDate) {
    var connectn = await $.hdb.getConnection();
    var query = "SELECT * FROM MY_ROICEAD_CONSUMPTIONFORECAST WHERE SITE = '" + Site + "' AND FORECASTDATE BETWEEN '" + StartDate + "' AND '" + EndDate + "'";
    var result = await connectn.executeQuery(query);
    connectn.close();
    return result;
}

async function updateOrderStatus(site, orderNum, status) {
    var connectn = await $.hdb.getConnection();
    var query = "UPDATE MY_ROICEAD_ORDERS SET ORDERSTATUS = '" + status + "' WHERE SITE = '" + site + "' AND ORDERNUM = '" + orderNum + "'";
    await connectn.executeUpdate(query);
    connectn.close();
}

async function updateMeterReading(site, meterNum, reading, date) {
    var connectn = await $.hdb.getConnection();
    var query = "INSERT INTO MY_ROICEAD_METERREADINGS (Site, MeterNum, MREADING, MeasureDate) VALUES ('" + site + "','" + meterNum + "','" + reading + "','" + date + "')";
    await connectn.executeUpdate(query);
    connectn.close();
}

async function updateTankInventory(site, tankNum, quantity, date, time) {
    var connectn = await $.hdb.getConnection();
    var query = "INSERT INTO MY_ROICEAD_TANKINVENTORY (Site, TankNum, QUANTITY, DATE, TIME) VALUES ('" + site + "','" + tankNum + "','" + quantity + "','" + date + "','" + time + "')";
    await connectn.executeUpdate(query);
    connectn.close();
}

async function insertReconciliationData(site, date, id, positiveVariance, negativeVariance, totalReconciledVolume) {
    var connectn = await $.hdb.getConnection();
    var query = "INSERT INTO MY_ROICEAD_RECONCILIATION (Site, Date, ID, PositiveVariance, NegativeVariance, TotalReconciledVolume) " +
        "VALUES ('" + site + "','" + date + "','" + id + "','" + positiveVariance + "','" + negativeVariance + "','" + totalReconciledVolume + "')";
    await connectn.executeUpdate(query);
    connectn.close();
}

async function insertOrder(site, orderNum, orderType, orderDate, status) {
    var connectn = await $.hdb.getConnection();
    var query = "INSERT INTO MY_ROICEAD_ORDERS (Site, OrderNum, OrderType, OrderDate, OrderStatus) VALUES ('" + site + "','" + orderNum + "','" + orderType + "','" + orderDate + "','" + status + "')";
    await connectn.executeUpdate(query);
    connectn.close();
}

async function insertNetworkGraphNode(nodeID, nodeName, nodeType, nodeXCoord, nodeYCoord) {
    var connectn = await $.hdb.getConnection();
    var query = "INSERT INTO MY_ROICEAD_NETWORKGRAPH (NodeID, NodeName, NodeType, NodeXCoord, NodeYCoord) " +
        "VALUES ('" + nodeID + "','" + nodeName + "','" + nodeType + "','" + nodeXCoord + "','" + nodeYCoord + "')";
    await connectn.executeUpdate(query);
    connectn.close();
}

async function insertDemandForecast(Site, MeterNum, Month, Year, Forecast) {
    var connectn = await $.hdb.getConnection();
    var query = "INSERT INTO MY_ROICEAD_FORECAST (Site, Meter_Num, Month, Year, Forecast) " +
        "VALUES ('" + Site + "','" + MeterNum + "','" + Month + "','" + Year + "','" + Forecast + "')";
    await connectn.executeUpdate(query);
    connectn.close();
}

async function insertSixMonthsDemandForecast(Site, MeterNum, StartMonth, StartYear, EndMonth, EndYear, Forecast) {
    var connectn = await $.hdb.getConnection();
    var query = "INSERT INTO MY_ROICEAD_FORECAST (Site, Meter_Num, Month, Year, Forecast) " +
        "VALUES ('" + Site + "','" + MeterNum + "','" + StartMonth + "','" + StartYear + "','" + Forecast + "'), " +
        "('" + Site + "','" + MeterNum + "','" + EndMonth + "','" + EndYear + "','" + Forecast + "')";
    await connectn.executeUpdate(query);
    connectn.close();
}

async function insertConsumptionForecast(Site, ForecastDate, Forecast) {
    var connectn = await $.hdb.getConnection();
    var query = "INSERT INTO MY_ROICEAD_CONSUMPTIONFORECAST (Site, ForecastDate, Forecast) " +
        "VALUES ('" + Site + "','" + ForecastDate + "','" + Forecast + "')";
    await connectn.executeUpdate(query);
    connectn.close();
}

async function insertSixMonthsConsumptionForecast(Site, StartDate, EndDate, Forecast) {
    var connectn = await $.hdb.getConnection();
    var query = "INSERT INTO MY_ROICEAD_CONSUMPTIONFORECAST (Site, ForecastDate, Forecast) " +
        "VALUES ('" + Site + "','" + StartDate + "','" + Forecast + "'), ('" + Site + "','" + EndDate + "','" + Forecast + "')";
    await connectn.executeUpdate(query);
    connectn.close();
}
try {
    var method = $.request.method;
    var output;
    if (method === $.net.http.POST) {
        console.log($.request.querystring)
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
            //output = 	$.MeterReadingAdjustment.adjustMeterReading(content);
            $.response.setBody("Error due to:" + oErr.message);
        }

    } else {
        var countRequestedFor = $.request.parameters.get('countFor');

        if (countRequestedFor === "pendingInvoices") {
            output = await countPendingInvoices();
        } else if (countRequestedFor === 'totalDrawingsAmount') {
            output = await calcTotalDrawingsAmount();
        } else if (countRequestedFor === 'DrawingsY2D') {
            output = await countDrawingsY2D();
        } else if (countRequestedFor === 'totalActiveCards') {
            output = await calcTotalActiveCards();
        } else if (countRequestedFor === 'totalNumberOfTanks') {
            output = await totalNumberOfTanks();
        } else if (countRequestedFor === 'totalCards') {
            output = await calcTotalNumberOfCards();
        } else if (countRequestedFor === 'totalBusinessPartner') {
            output = await totalNumberOfBusinessPartners();
        } else if (countRequestedFor === 'totalSiteNumbers') {
            output = await totalNumberOfSites();
        } else if (countRequestedFor === 'getBPNumber') {
            output = await getBPNumber();
        } else if (countRequestedFor === 'getOrderNumber') {
            output = await getReplenishmentOrder();
        } else if (countRequestedFor === 'getProfileNumber') {
            output = await getProfileNumber();
        } else if (countRequestedFor === 'getSiteNumber') {
            output = await getSiteNumber();
        } else if (countRequestedFor === 'getTankInventoryID') {
            output = await getTankInventoryID();
        } else if (countRequestedFor === 'getReadingWithLastClosestRecord') {
            var site = $.request.parameters.get('site');
            var meternum = $.request.parameters.get('meternum');
            var date = $.request.parameters.get('date');
            output = await getReadingWithLastClosestRecord(date, site, meternum);
        } else if (countRequestedFor === 'getMeterInventoryID') {
            output = await getMeterInventoryID();
        } else if (countRequestedFor === 'getTanksWithLatestInventory') {
            var site = $.request.parameters.get('site');
            output = await getTanksWithLatestInventory(site);
            output = JSON.stringify(output);
        } else if (countRequestedFor === 'getMetersWithLatestInventory') {
            var site = $.request.parameters.get('site');
            output = await getMetersWithLatestInventory(site);
            output = JSON.stringify(output);
        } else if (countRequestedFor === 'getNearBySites') {
            var lat = $.request.parameters.get('lat');
            var long = $.request.parameters.get('long');
            var rad = $.request.parameters.get('radius');
            var prodID = $.request.parameters.get('prodId');
            var comp = $.request.parameters.get('comp');
            var centerPoint = { lat: lat, lng: long };
            rad = parseFloat(rad, [2]);
            output = await getAllSites(rad, centerPoint, prodID, comp);
            output = JSON.stringify(output);
        } else if (countRequestedFor === 'getReconciliationID') {
            output = await $.Reconciliation.getReconcNumber();
        } else if (countRequestedFor === 'reconciliation') {
            var site = $.request.parameters.get('site');
            var siteType = $.request.parameters.get('siteType');
            //var sObjectId =  sites.split(";");
            var tanks = $.request.parameters.get('tanks');

            var startDate = $.request.parameters.get('startDate');
            var endDate = $.request.parameters.get('endDate');
            var period = $.request.parameters.get('period');
            tanks = decodeURIComponent(tanks);
            var reconciliation = "";
            output = await $.Reconciliation.getTanksWithReconciliation(site, tanks, startDate, endDate, siteType, period);
            output = JSON.stringify(output);
        } else if (countRequestedFor === 'getNetworkGraph') {
            output = await $.NetworkGraph.getNetworkGraph();
            output = JSON.stringify(output);
        } else if (countRequestedFor === 'runForecast') {
            var site = $.request.parameters.get('site');
            var tanks = $.request.parameters.get('tanks');
            tanks = decodeURIComponent(tanks);
            output = await $.Forecast.executeForecast(site, tanks);
            output = JSON.stringify(output);
        } else if (countRequestedFor === 'getForecastOrder') {
            var site = $.request.parameters.get('site');
            var tankgrp = $.request.parameters.get('tankgrp');
            output = await $.ProposeOrder.getForecastOrder(site, tankgrp);
            output = JSON.stringify(output);
        } else if (countRequestedFor === 'runForecastFor6Months') {
            var sites = $.request.parameters.get('sites');

            sites = decodeURIComponent(sites);
            output = await $.Forecast6Months.getSiteTanksAndExecuteForecast(sites);
            output = JSON.stringify(output);
        }

        $.response.setBody(output);
    }
} catch (err) {
    $.response.setBody("Error due to:" + err.message);
}

