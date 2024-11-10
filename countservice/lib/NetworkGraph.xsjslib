async function getNetworkGraph() {
	var connectn = await $.hdb.getConnection();
	/*var query = "SELECT SITE.SITE,SITE.SITETYPE,SITE.ACRONYM,SITE.NAME1,SITE.STREET1,SITE.CITY,SITE.STATUS,SITE.PRIMARYNETWORK,SITE.SUBNETWORK,SITE.LOCATIONGROUP,TANK.TANKNUM,METTANK.METERNUM,TANK.TOPSAFE_VOL,TANK.TARLVL_VOL,TANK.VOLUOM,TANK.BTMSAF_VOL,TANK.ORDLVL_VOL   " +
				"FROM MY_ROICEAD_SITEDETAILS as Site INNER JOIN MY_ROICEAD_TANKS AS TANK ON SITE.SITE = TANK.SITE LEFT OUTER JOIN MY_ROICEAD_METERTANKALLOCATION AS METTANK ON TANK.TANKNUM = METTANK.TANKNUM AND TANK.SITE = METTANK.SITE" +
				" where site.status = 'ACTIVE' AND TANK.STATUS = 'ACTIVE' ORDER BY SITE.PRIMARYNETWORK,	SITE.SUBNETWORK,SITE.LOCATIONGROUP,SITE.SITE,TANK.TANKNUM" ;*/
	var query = "SELECT SITE.SITE,SITE.SITETYPE,SITE.ACRONYM,SITE.NAME1,SITE.STREET1,SITE.CITY,SITE.STATUS,SITE.PRIMARYNETWORK," +
				"SITE.SUBNETWORK,SITE.LOCATIONGROUP,TANK.TANKNUM,TANK.TOPSAFE_VOL,TANK.TARLVL_VOL,TANK.VOLUOM,TANK.BTMSAF_VOL,TANK.ORDLVL_VOL " +
				"FROM MY_ROICEAD_SITEDETAILS as Site INNER JOIN MY_ROICEAD_TANKS AS TANK ON SITE.SITE = TANK.SITE " +
				"where site.status = 'ACTIVE' AND TANK.STATUS = 'ACTIVE' " +
				"ORDER BY SITE.PRIMARYNETWORK,	SITE.SUBNETWORK,SITE.LOCATIONGROUP,SITE.SITE,TANK.TANKNUM ";			
	var meterQuery = "SELECT * FROM MY_ROICEAD_METERREADINGS ORDER BY site ASC, meternum ASC, measuredate desc"			;
	var tankQuery = "SELECT * FROM MY_ROICEAD_TANKINVENTORY order by site,tanknum,mdate desc, mtime desc"			;
	var metertank = "SELECT site,tanknum,meternum, max(valid_from) FROM MY_ROICEAD_METERTANKALLOCATION group by site,tanknum,meternum";
	var resultSet =  await connectn.executeQuery(query);
	var meterData =  await connectn.executeQuery(meterQuery);
	var tankData =  await connectn.executeQuery(tankQuery);
	var meterTankData =  await connectn.executeQuery(metertank);
	var response = mergeData(resultSet,meterData,tankData,meterTankData);
	return response;
	//return resultSet;
}
function mergeData (resultSet,meterData,tankData,meterTankData){
	for(var i=0;i<resultSet.length;i++){
		var curr = resultSet[i];
		for(var k=0;k<tankData.length;k++){
			if(tankData[k].TANKNUM === curr.TANKNUM && tankData[k].SITE === curr.SITE){
				curr.MATERIALDESC = tankData[k].MATERIALDESC;
				curr.TANKINV	 = tankData[k].MQUAN;
				curr.tankState = formatWarningLvl(curr.ORDLVL_VOL,tankData[k].MQUAN,curr.BTMSAF_VOL);
				break;
			}
		}
		curr.METERNUM =  "";
		curr.METERREADING = "";
		for(var k=0;k<meterTankData.length;k++){
			if(meterTankData[k].METERNUM && meterTankData[k].TANKNUM === curr.TANKNUM && meterTankData[k].SITE === curr.SITE){
				curr.METERNUM = curr.METERNUM + "," + meterTankData[k].METERNUM ;
				for(var j=0;j<meterData.length;j++){
					if(meterData[j].METERNUM && meterData[j].METERNUM === meterTankData[k].METERNUM && meterData[j].SITE === curr.SITE){
						//curr.MATERIALDESC = meterData[k].MATERIALDESC;
						curr.METERREADING	 = curr.METERREADING + "," +meterData[j].MREADING ;
						break;
					}
				}
			}
		}
		
		
		
		resultSet[i] = curr;
	}
	return resultSet;
}
 function formatWarningLvl (ordrLvl, actual, BtmSafeLvl) {
			var color = "Success";
			
			ordrLvl = parseFloat(ordrLvl);
			BtmSafeLvl = parseFloat(BtmSafeLvl);
			actual = parseFloat(actual);
			

			if (actual >= ordrLvl) {
				color = "Success";
			} else if (actual > BtmSafeLvl) {
				color = "Warning";
			} else if (actual <= BtmSafeLvl) {
				color = "Error";
			}
			return color;
		}
async function formatDataStructure(resultSet, meterData){
	var result = getResultStructure();
	var key = 0;
	for(var i=0;i<resultSet.length;i++){
		var curr = resultSet[i];
		curr.filterText= getFilteredText(curr);
		if(i!== 0){
			
			var prev = resultSet[i-1];
			
			if(curr.SITE === prev.SITE){
				//Sites are same.. so just add Tank and Meter data
				var siteKey = getKey(curr.NAME1, result.nodes);
				var tank  = getNodeStructure(++key,5,curr.TANKNUM,getIconBasedOnNodeType("Tank"),curr.filterText);
				tank.attributes = await addTankAttributes(curr);
				result.nodes.push(tank);
				result.lines.push(getLineStructure(siteKey,tank.key));
				if(curr.METERNUM !== null && curr.METERNUM !== "" ){
				var meter  = getNodeStructure(++key,6,curr.METERNUM,getIconBasedOnNodeType("Meter"),curr.filterText);
				result.nodes.push(meter);
				result.lines.push(getLineStructure(tank.key,meter.key));
				}
			}else{
				//Site has changed.. Check for prim nw sub nw loc grp changes and add details
				var subNWKey, primNWKey,locGrpKey,isPrimNWKeyNew,issubNWKeyNew,isLocNew ;
				if(curr.PRIMARYNETWORK === prev.PRIMARYNETWORK){
					 primNWKey = getKey(curr.PRIMARYNETWORK, result.nodes);
					 isPrimNWKeyNew = false;
				}else{
					var PrimNw = getNodeStructure(++key,1,curr.PRIMARYNETWORK,getIconBasedOnNodeType("PrimaryNw"),curr.filterText); //For first time do not add 1 to key
					result.nodes.push(PrimNw);
					 primNWKey = key;
					 isPrimNWKeyNew = true;
				}
				subNWKey = getKey(curr.SUBNETWORK, result.nodes);
				if(subNWKey === null){
					var SubNW  = getNodeStructure(++key,2,curr.SUBNETWORK,getIconBasedOnNodeType("SubNw"),curr.filterText);
					result.nodes.push(SubNW);
					result.lines.push(getLineStructure(primNWKey,SubNW.key));
					 subNWKey = SubNW.key ;
					 issubNWKeyNew = true;
				}else{
					issubNWKeyNew = false;
				}
				if(isPrimNWKeyNew){
					result.lines.push(getLineStructure(primNWKey,subNWKey));
				}
				locGrpKey = getKey(curr.LOCATIONGROUP, result.nodes);
				if(locGrpKey === null){
			
					var LocGrp  = getNodeStructure(	++key,3,curr.LOCATIONGROUP,getIconBasedOnNodeType("LocGrp"),curr.filterText);
					result.nodes.push(LocGrp);
					result.lines.push(getLineStructure(subNWKey, LocGrp.key));
					locGrpKey = LocGrp.key ;
					isLocNew = true;
				}else{
					isLocNew = false;
				}
				if(issubNWKeyNew){
					result.lines.push(getLineStructure(subNWKey, locGrpKey));
				}
				var site  = getNodeStructure(++key,4,curr.NAME1,getIconBasedOnNodeType(curr.SITETYPE),curr.filterText);
				site.attributes = addSiteAttributes(curr);
				result.nodes.push(site);
				result.lines.push(getLineStructure(locGrpKey,site.key));
				
				var tank  = getNodeStructure(++key,5,curr.TANKNUM,getIconBasedOnNodeType("Tank"),curr.filterText);
				tank.attributes = await addTankAttributes(curr);
				result.nodes.push(tank);
				result.lines.push(getLineStructure(site.key,tank.key));
				if(curr.METERNUM !== null && curr.METERNUM !== "" ){
					var meter  = getNodeStructure(++key,6,curr.METERNUM,getIconBasedOnNodeType("Meter"),curr.filterText);
					result.nodes.push(meter);
					result.lines.push(getLineStructure(tank.key,meter.key));
				}	
			}
		}else{
			
			//First loop add the network nodes
			
			var PrimNw = getNodeStructure(key,1,curr.PRIMARYNETWORK,getIconBasedOnNodeType("PrimaryNw"),curr.filterText); //For first time do not add 1 to key
			result.nodes.push(PrimNw);
			var SubNW  = getNodeStructure(++key,2,curr.SUBNETWORK,getIconBasedOnNodeType("SubNw"),curr.filterText);
			result.nodes.push(SubNW);
			result.lines.push(getLineStructure(PrimNw.key,SubNW.key));
			var LocGrp  = getNodeStructure(	++key,3,curr.LOCATIONGROUP,getIconBasedOnNodeType("LocGrp"),curr.filterText);
			result.nodes.push(LocGrp);
			result.lines.push(getLineStructure(SubNW.key, LocGrp.key));
			
			var site  = getNodeStructure(++key,4,curr.NAME1,getIconBasedOnNodeType(curr.SITETYPE),curr.filterText);
			site.attributes = addSiteAttributes(curr);
			result.nodes.push(site);
			result.lines.push(getLineStructure(LocGrp.key,site.key));
			
			var tank  = getNodeStructure(++key,5,curr.TANKNUM,getIconBasedOnNodeType("Tank"),curr.filterText);
			tank.attributes = await addTankAttributes(curr);
			result.nodes.push(tank);
			result.lines.push(getLineStructure(site.key,tank.key));
			
			if(curr.METERNUM !== null && curr.METERNUM !== "" ){
				var meter  = getNodeStructure(++key,6,curr.METERNUM,getIconBasedOnNodeType("Meter"),curr.filterText);
				result.nodes.push(meter);
				result.lines.push(getLineStructure(tank.key,meter.key));
			}
		}
	}
	return result;
}
function getKey(title,nodes){
	var key = null;
	for(var i = 0; i<nodes.length; i++){
		if(nodes[i].title === title){
			key = nodes[i].key;
			break;
		}
	}
	return key;
}
function getFilteredText (curr){
	var text = curr.SITE + curr.TANKNUM + curr.MATERNUM + curr.PRIMARYNETWORK + curr.LOCATIONGROUP + curr.SUBNETWORK + curr.NAME1 ;
	return text;
} 
function addSiteAttributes (curr){
	var attributes = [
		{
			"label": "Site Type",
			"value": curr.SITETYPE
		},
		{
			"label": "Site",
			"value": curr.SITE
		},
		{
			"label": "Acronym",
			"value": curr.ACRONYM
		}
		
	];
	return attributes;
}
async function addTankAttributes (curr){
	var connectn = await $.hdb.getConnection();
	var inventoryQuery = "select TI.MQUAN, TI.MATERIALID, TI.MATERIALDESC from MY_ROICEAD_TANKINVENTORY AS TI WHERE  TI.Site = '" + curr.SITE +"' AND TI.TANKNUM = '" + curr.TANKNUM + 
							"' AND TI.MDATE = (SELECT MAX(MDATE) FROM MY_ROICEAD_TANKINVENTORY  WHERE Site = '" + curr.SITE + "' and TankNum = '" + curr.TANKNUM  + "') "	
							" ORDER BY TI.TANKNUM,TI.MDATE, TI.MTIME DESC "	;
	var inventoryRes = 	await connectn.executeQuery(inventoryQuery);	
	if(inventoryRes.length >= 1){
		curr.MATERIAL = inventoryRes[inventoryRes.length - 1].MATERIALID + " ("+ inventoryRes[inventoryRes.length - 1].MATERIALDESC + ")";
		curr.ACTUALVOL = inventoryRes[inventoryRes.length - 1].MQUAN;
	}	
	var attributes = [
		{
			"label": "Material",
			"value": curr.MATERIAL
		},
		
		{
			"label": "Top Safe Level Vol",
			"value": curr.TOPSAFE_VOL + " " + curr.VOLUOM
		},
		{
			"label": "Target Level Vol",
			"value": curr.TARLVL_VOL + " " + curr.VOLUOM
		},
		{
			"label": "Actual Vol",
			"value": curr.ACTUALVOL + " " + curr.VOLUOM
		}
		
	];
	return attributes;
}
function getNodeStructure(key,group,title,icon,filtertext) {
 return	{
			"key": key,
			"icon": icon,
			"title": title,
			"group": group,
			"filtertext" : filtertext
		};
}
function getIconBasedOnNodeType(nodeType){
	var icon = "";
	switch (nodeType) {
		case 'PrimaryNw' :
			icon = "sap-icon://world";
			break;
		case 'SubNw' :
			icon = "sap-icon://chain-link";
			break;
		case 'LocGrp' :
			icon = "sap-icon://map-2";
			break;	
		case 'FUELS' :
			icon = "sap-icon://mileage";
			break;
		case 'PWSUP' :
			icon = "sap-icon://building";
			break;
		case 'CUSTS' :
			icon = "sap-icon://customer";
			break;
		case 'Tank' :
			icon = "sap-icon://measuring-point";
			break;
		case 'Meter' :
			icon = "sap-icon://unwired";
			break;	
	}
	return icon;
	
} 
function getLineStructure(from,to) {
	return {
		"from" : from,
		"to" : to
	};
}
function getResultStructure() {
	return {
		"filtertext" : "",
		"nodes" : [],
		"lines" : [],
		"groups": [
				{
					"key": 1,
					"title": "Primary Network"
					
				},
				{
					"key": 2,
					"title": "Sub Network"
				},
				{
					"key": 3,
					"title": "Location Group"
				},
				{
					"key": 4,
					"title": "Site Locations"
				},
				{
					"key": 5,
					"title": "Tanks"
				},
				{
					"key": 6,
					"title": "Meters"
				}
			]
		};	
	
}