function getReconcNumber() {
	var connectn = $.hdb.getConnection();
	var query = 'SELECT GETRECONCILIATIONID.NEXTVAL FROM DUMMY';
	var result = connectn.executeQuery(query);
	var count = result[0]['GETRECONCILIATIONID.NEXTVAL']._val;
	connectn.close(); //Close the  connections
	return count;
}
function getTanksWithReconciliation(sites,SitesFilter,startDate,endDate,siteType,period){
	
	var connectn = $.hdb.getConnection();
	/*var tankQuery = "select * from MY_ROICEAD_TANKS AS TANKS LEFT OUTER JOIN MY_ROICEAD_TANKINVENTORY AS TI ON TANKS.SITE = TI.SITE AND TANKS.TANKNUM = TI.TANKNUM WHERE " +
					"TI.MDATE = (SELECT MAX(TI.MDATE) FROM MY_ROICEAD_TANKINVENTORY AS TI WHERE  TI.Site = '" + Site +"' AND TI.TANKNUM = TANKS.TANKNUM) ORDER BY TI.TANKNUM,TI.MDATE, TI.MTIME DESC " ;*/
	if(SitesFilter !== ""){
	var dataFilter = SitesFilter.split(";");
	var filters = "";
	for(var i=0;i<dataFilter.length;i++){
		var siteNTanks = dataFilter[i].split("DUMMY");
		var filter = " site.Site = " + siteNTanks[0] + " and tanks.TANKNUM = '" + siteNTanks[1] + "'";
		if(i<dataFilter.length - 1){
			filter = filter + ") or (";
		}
		filters = filters + filter;
	}
	filters = "(" + filters + ")";
	}
	if(sites !== ""){
		filters = " site.Site IN (" + sites + ")";
	}
	if(siteType !== ""){
		filters = " and site.SITETYPE = '" + siteType + "'";
	}
	var tankSearch = "";
	
	var sitesQuery = "Select site.SITE, site.NAME1, site.SITETYPE, site.EXT_BP, site.ACRONYM,tanks.MAXCAP_VOL,tanks.TARLVL_VOL,tanks.VOLUOM,tanks.TANKNUM from MY_ROICEAD_SITEDETAILS as site inner join MY_ROICEAD_TANKS as tanks on site.SITE = tanks.SITE where" +  filters + "" ; //site.SITE IN (" + Sites + ") and site.status = 'ACTIVE' and tanks.status = 'ACTIVE'" + tankSearch ;
	var currDateQ = 'SELECT CURRENT_DATE  FROM DUMMY';
	var currDateR = connectn.executeQuery(currDateQ);
	if(!endDate || endDate === ""){
		endDate = currDateR[0].CURRENT_DATE;
	}
	//var tankQuery = "Select * from  where SITE = '" + Sites + "' and status = 'ACTIVE'" ;
	
	var result = connectn.executeQuery(sitesQuery);
	//var tankresult = connectn.executeQuery(tankQuery);
	var reconciliationList = [];
	for(var i=0 ; i<result.length; i++){
		result[i].MaterialDesc = "";
		result[i].MaterialId=  "";
		result[i].MDATE = null;
		result[i].MTIME = null;
		var Site = result[i].SITE;
		
		var reconciliationQuery = "SELECT * FROM MY_ROICEAD_METERRECONCILIATION where Site = '" + Site + "' and tanknum = '" + result[i].TANKNUM + "' AND ReconcDate = (SELECT MAX(ReconcDate) FROM MY_ROICEAD_METERRECONCILIATION  WHERE Site = '" + Site + "' and tanknum = '" + result[i].TANKNUM  + "' and ReconcDate <= '"+ endDate + "')";
		var reconciliationResult = connectn.executeQuery(reconciliationQuery);
		if(reconciliationResult[0]){
			result[i].RECONCDATE = reconciliationResult[0].RECONCDATE ;
			result[i].INVENTORYENDQTY = reconciliationResult[0].INVENTORYENDQTY ;
			result[i].METERRECONCQUAN = reconciliationResult[0].MQUANTITY ;
			result[i].SUPPLYQTY = reconciliationResult[0].SUPPLYQTY ;
			result[i].CURRSUPPLYQTY = 0;
			result[i].CALCDIFFQTY = reconciliationResult[0].DIFFQTY ;
			result[i].CALCDIFFPERCENT = reconciliationResult[0].DIFFPERCENT ;
			result[i].DIFFQTY = 0 ;
			result[i].DIFFPERCENT = 0;
			result[i].ISEDITABLE = false;
		}else{
			result[i].RECONCDATE = null ;
			result[i].INVENTORYENDQTY = 0;
			result[i].METERRECONCQUAN = 0;
			result[i].SUPPLYQTY = 0 ;
			result[i].CURRSUPPLYQTY = 0;
			result[i].CALCDIFFQTY = 0 ;
			result[i].CALCDIFFPERCENT = 0;
			result[i].DIFFQTY = 0 ;
			result[i].DIFFPERCENT = 0;
			result[i].ISEDITABLE = true;
		}
		if(sites !== ""){
		  result[i].SUPPLYQTY = 0 ;
		}
		result[i].MREADING = 0.0 ;
		var measureDateFilter = "";
		var MDATEFilter = "";
		var supplydatefilter = '';
		if(!result[i].RECONCDATE || result[i].RECONCDATE === null){
			measureDateFilter = "and MeasureDate <= '" + endDate + "'";
			MDATEFilter = "and MDATE <= '" + endDate + "'";
			supplydatefilter = "and SUPPL_DATE <= '" + endDate + "'";
		}else{
			var reconcD = this.formatDateTime(result[i].RECONCDATE);
			measureDateFilter = "and (MeasureDate between '" + reconcD + "' and '" +endDate + "' )";
			MDATEFilter = "and (MDATE between '" + reconcD + "' and '" +endDate + "' )";
			supplydatefilter = "and (SUPPL_DATE between '" + reconcD + "' and '" +endDate + "' )";
		}
		var inventoryQuery = "select * from MY_ROICEAD_TANKINVENTORY AS TI WHERE  TI.Site = '" + Site +"' AND TI.TANKNUM = '" + result[i].TANKNUM + 
							"' AND TI.MDATE = (SELECT MAX(MDATE) FROM MY_ROICEAD_TANKINVENTORY  WHERE Site = '" + Site + "' and TankNum = '" + result[i].TANKNUM  + "'" + MDATEFilter + ") "	
							" ORDER BY TI.TANKNUM,TI.MDATE, TI.MTIME DESC "	;
		var inventoryRes = 	connectn.executeQuery(inventoryQuery);	
		var materialQuery = 'SELECT TOP 1 * FROM MY_ROICEAD_MATERIALALLOCATION WHERE Valid_from < (SELECT CURRENT_DATE "current date" FROM DUMMY) and site = ' + 
							"'" + Site + "' and TankNum = '" + result[i].TANKNUM + "' ORDER BY Valid_from DESC" ;
		/*var materialQuery = 'SELECT * FROM MY_ROICEAD_MATERIALALLOCATION as MatAll  WHERE  site = '
							+ "'" + Site + "' and TankNum = '" + result[i].TANKNUM + "' ORDER BY Valid_from DESC" */
				
		var matRes = connectn.executeQuery(materialQuery);
		
		var orderquery = "SELECT * FROM MY_ROICEAD_REPLENISHMENTORDERS where isstatuschgd = false and  Site_Site = '" + Site + "' and TANKNUM = '" +result[i].TANKNUM + "' " + supplydatefilter ;
		var orderRes = connectn.executeQuery(orderquery);
		result[i].MQUAN = 0;
		if(inventoryRes.length >= 1){
			result[i].MQUAN = result[i].MQUAN + parseFloat(inventoryRes[inventoryRes.length - 1].MQUAN);
			result[i].MDATE = inventoryRes[inventoryRes.length - 1].MDATE;
			result[i].MTIME = inventoryRes[inventoryRes.length - 1].MTIME;
			result[i].MaterialId = inventoryRes[inventoryRes.length - 1].MATERIALID;
			result[i].MaterialDesc = inventoryRes[inventoryRes.length - 1].MATERIALDESC;
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
		for(var x=0; x< orderRes.length ; x++){
			result[i].CURRSUPPLYQTY = parseFloat(result[i].CURRSUPPLYQTY) + parseFloat(orderRes[x].SUPPL_QTY);                         
		}
		var meterAllotedToTanksQuery = "SELECT Distinct METERNUM FROM MY_ROICEAD_METERTANKALLOCATION as meterTankAllocation where meterTankAllocation.Site = '" + Site + "' and meterTankAllocation.TankNum = '" + result[i].TANKNUM + "'";
		var metersAlloted = connectn.executeQuery(meterAllotedToTanksQuery);
		
		for(var k=0;k<metersAlloted.length;k++){
			var mReadings = 0;
			/*	var meterReadingsQuery = "SELECT * FROM MY_ROICEAD_METERREADINGS AS TI WHERE  TI.Site = '" + Site +"'  AND TI.METERNUM = '" + metersAlloted[k].METERNUM + 
							"' AND TI.MeasureDate = (SELECT MAX(MeasureDate) FROM MY_ROICEAD_METERREADINGS  WHERE Site = '" + Site + "' and MeterNum = '" + metersAlloted[k].METERNUM  + "'" + measureDateFilter + ")" +
							" ORDER BY TI.METERNUM,TI.MeasureDate DESC "	; */
/*	var meterReadingsQuery =	"SELECT * FROM MY_ROICEAD_METERREADINGS AS TI 	INNER JOIN" +
  "(SELECT MAX(MeasureDate) AS maxUpdatedAt FROM MY_ROICEAD_METERREADINGS  WHERE  Site = '" + Site +"'  AND METERNUM = '" + metersAlloted[k].METERNUM + 	"'" + measureDateFilter + " GROUP BY  EXTRACT ( DAY FROM MEASUREDATE), EXTRACT ( MONTH FROM MEASUREDATE) ) as Lookup " +
    " ON Lookup.MaxUpdatedAt = TI.MeasureDate WHERE TI.Site = '" + Site + "' and TI.MeterNum = '" + metersAlloted[k].METERNUM  + "'" + measureDateFilter + "" + " ORDER BY TI.METERNUM,TI.MeasureDate"		;			
	*/
	var meterReadingsQuery =	"SELECT * FROM MY_ROICEAD_METERREADINGS AS TI  WHERE TI.Site = '" + Site + "' and TI.MeterNum = '" + metersAlloted[k].METERNUM  + "'" + measureDateFilter + "" + " ORDER BY TI.METERNUM,TI.MeasureDate"		;			
		var meterReadingsRes = 	connectn.executeQuery(meterReadingsQuery);	
		result[i].METERNUM = metersAlloted[k].METERNUM ;
		for(var m = 0; m<(meterReadingsRes.length ); m++ ){
			mReadings =  parseFloat(meterReadingsRes[m].MQUANTITY) + mReadings;
			
		}
		result[i].MREADING = (parseFloat(result[i].MREADING) + mReadings).toFixed(2);
		reconciliationList.push(result[i]);
		}
		
	var diff = {};
	if(period !== "All" && period !== ""){
		diff = getDiffQtyNPercent(period,Site,result[i].TANKNUM);	
		result[i].CALCDIFFQTY = diff.QTY;
		result[i].CALCDIFFPERCENT = diff.PERCENT;
		result[i].PERIOD = diff.period;
	}else if(period === "All"){
		var diff1 = getDiffQtyNPercent("currmonth",Site,result[i].TANKNUM);
		result[i].CURRDIFFQTY = diff1.QTY;
		result[i].CURRDIFFPERCENT = diff1.PERCENT;
		
		var diff2 = getDiffQtyNPercent("prevmonth",Site,result[i].TANKNUM);
		result[i].PREVDIFFQTY = diff2.QTY;
		result[i].PREVDIFFPERCENT = diff2.PERCENT;
		
		var diff3 = getDiffQtyNPercent("quarter",Site,result[i].TANKNUM);
		result[i].QRTRDIFFQTY = diff3.QTY;
		result[i].QRTRDIFFPERCENT = diff3.PERCENT;
		
		var diff4 = getDiffQtyNPercent("year",Site,result[i].TANKNUM);
		result[i].YEARDIFFQTY = diff4.QTY;
		result[i].YEARDIFFPERCENT = diff4.PERCENT;
	}
	
	}
	connectn.close();
	return result;
}
function getDiffQtyNPercent(period, site, tanknum){
	var qstring = "";
	var shortp = "";
	var connectn = $.hdb.getConnection();
	if(period !== "All"){
	if(period === "currmonth"){
		qstring = 'WHERE EXTRACT(MONTH FROM "RECONCDATE") = EXTRACT(MONTH FROM CURRENT_DATE)';
		shortp = "CurrMonth" ;
	}
	else if(period === "prevmonth"){
		qstring = 'where EXTRACT(MONTH from RECONCDATE) = (EXTRACT( MONTH FROM CURRENT_DATE) - 1 )';
		shortp = "PrevMonth" ;
	}
	else if(period === "quarter"){
		qstring = 'WHERE QUARTER("RECONCDATE") = QUARTER(CURRENT_DATE)';
		shortp = "Quarter" ;
	}
	else if(period === "year"){
		qstring = 'WHERE EXTRACT(YEAR FROM "RECONCDATE") = EXTRACT(YEAR FROM CURRENT_DATE) ';
		shortp = "Year" ;
	}
	var sitentankfilter = " and site = '" + site + "' and tanknum = '" + tanknum + "'";
	
	
	var query = "SELECT SITE, TANKNUM, 	SUM( TO_DECIMAL (DIFFQTY)) AS QTY, SUM(TO_DECIMAL (DIFFPERCENT)) AS PERCENT FROM MY_ROICEAD_METERRECONCILIATION " +
				qstring + sitentankfilter + " group by SITE, TANKNUM" ;
	var queryResp = connectn.executeQuery(query);
	if(queryResp[0]){
		 queryResp[0].QTY = parseFloat(queryResp[0].QTY).toFixed(3) ;
		 queryResp[0].PERCENT = parseFloat(queryResp[0].PERCENT).toFixed(4)  ;
		 queryResp[0].period = shortp;
		return queryResp[0];
	}else{
		return{
			QTY : 0,
			PERCENT : 0,
			period : shortp
		};
	}
	
	}
}
function formatDateTime(date) {
	
			var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();

			var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
			var dates = date.getFullYear() + "-" + MM + "-" + dd ;
			var HH = date.getHours();
			var MM = date.getMinutes();
			var SS = date.getSeconds();
			var time = "T" + HH + ":" + MM + ":" + SS ;
			return (dates + time);
}