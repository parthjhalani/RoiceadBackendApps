var connectn = await $.hdb.getConnection();
var TableUpdate = {
updateTableRecords : async function (content) {
    try {
        var record = JSON.parse(content);
        if (record.tablename === 'Drawings') {
            await TableUpdate.insertInDrawings(JSON.parse(record.data));
        }
        if (record.tablename === 'SitePosHeader') {
            await TableUpdate.insertPosHeader(JSON.parse(record.data));
        }
        if (record.tablename === 'SitePOSItems') {
            await TableUpdate.insertPosItems(JSON.parse(record.data));
        }
        if (record.tablename === 'TankInventory') {
            await TableUpdate.insertTankInventoryData(JSON.parse(record.data));
        }
        return "Data Record is successfully Saved";
    } catch (oErr) {
        console.log(oErr);
        return oErr.message;
    }
},

insertPosItems : async function  (data) {
    let selectQueryDel = `Select TOP 1 * from MY_ROICEAD_SITEPOSITEMS`;
    let selectQueryData = await connectn.executeUpdate(selectQueryDel);
	for(var i=0; i< data.length; i++){
            let item = data[i];
            let AMOUNT = TableUpdate.convertToFloat(item.AMOUNT);
				await connectn.executeUpdate(querydel);
                let insertQuery = TableUpdate.generateInsertQuery(item, selectQueryData.columnInfo, 'MY_ROICEAD_SITEPOSHEADER');
                insertQuery =  insertQuery.replace(/undefined/g, null);
                try {
                    await connectn.executeUpdate(insertQuery);
                }catch(e){
                    console.log(e.message);
                }
				
	}    
    await connectn.commit();    
},
insertPosHeader : async function (data) {
    let selectQueryDel = `Select TOP 1 * from MY_ROICEAD_SITEPOSHEADER`;
    
    let selectQueryData = await connectn.executeUpdate(selectQueryDel);
	for(var i=0; i< data.length; i++){
            let item = data[i];
            item.TransactDate = TableUpdate.timestampConverter(new Date(item.TransactDate));
            
            item[Object.keys(item).find(key => key.toLowerCase() === 'isconfirmed')] = TableUpdate.convertStrToBool(item[Object.keys(item).find(key => key.toLowerCase() === 'isconfirmed')]);
        item[Object.keys(item).find(key => key.toLowerCase() === 'isinvoiced')] = TableUpdate.convertStrToBool(item[Object.keys(item).find(key => key.toLowerCase() === 'isinvoiced')]);
            // let delquery = `delete from ${tabName} where TransactId = '${item.TransactId}'`;
            // await tx.run(delquery);
            // await tx.run (INSERT(item).into(Drawings))
        
				let querydel = `delete from MY_ROICEAD_SITEPOSHEADER where SiteTrnID = '${item.SiteTrnID}'`;
				let insertQuery = TableUpdate.generateInsertQuery(item, selectQueryData.columnInfo, 'MY_ROICEAD_SITEPOSHEADER');
                insertQuery =  insertQuery.replace(/undefined/g, null);
				await connectn.executeUpdate(querydel);
                try {
                    await connectn.executeUpdate(insertQuery);
                }catch(e){
                    console.log(e.message);
                }
				
       }
       await connectn.commit();
},
insertInDrawings : async function (data){
    let selectQueryDel = `Select TOP 1 * from MY_ROICEAD_DRAWINGS`;
    let selectQueryData = await connectn.executeUpdate(selectQueryDel);
    debugger;
    for(var i=0; i<data.length; i++){
        let item = data[i];
        item[Object.keys(item).find(key => key.toLowerCase() === 'isconfirmed')] = TableUpdate.convertStrToBool(item[Object.keys(item).find(key => key.toLowerCase() === 'isconfirmed')]);
        item[Object.keys(item).find(key => key.toLowerCase() === 'isinvoiced')] = TableUpdate.convertStrToBool(item[Object.keys(item).find(key => key.toLowerCase() === 'isinvoiced')]);
        let TRANSACTDATE = TableUpdate.timestampConverter(new Date(item["TRANSACTDATE"]));//; TableUpdate.timestampConverter(item["TransactDate (UTC)"]);
        let Quantity = TableUpdate.convertToFloat(item.QUANTITY);
        let querydel = `delete from MY_ROICEAD_DRAWINGS where TransactId = '${item.TRANSACTID}'`;
        await connectn.executeUpdate(querydel);

        if(!item["PUMP"]){
        	item["PUMP"] = '';
        }
        let insertQuery = TableUpdate.generateInsertQuery(item, selectQueryData.columnInfo, 'MY_ROICEAD_DRAWINGS');
        insertQuery =  insertQuery.replace(/undefined/g, null);
        try {
            await connectn.executeUpdate(insertQuery);
        }catch(e){
            console.log(e.message);
        }
    }
    await connectn.commit();
},
generateInsertQuery : function (item, columnInfo, tableName) {
    // Extract column names in order from columnInfo
    const columns = columnInfo.map(col => col.columnName);

    const values = columns.map(col => {
        // Handle different types of columns
        const columnType = columnInfo.find(c => c.columnName === col)?.typeName;
        
        // Check if value exists and handle different types
        const value = item[Object.keys(item).find(key => key.toLowerCase() === col.toLowerCase())];
        
        if (['UVAL8', 'DECIMAL'].includes(columnType)) {
            // Numeric columns - don't quote
            return value !== undefined && value !== null ? value : 'NULL';
        } else {
            // String columns - quote the value
            return value !== undefined && value !== null ? `'${value}'` : 'NULL';
        }
    });

    return `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${values.join(',')})`;
},


insertTankInventoryData : async function (data){
    let selectQueryDel = `Select TOP 1 * from MY_ROICEAD_TANKINVENTORY`;
    let selectQueryData = await connectn.executeUpdate(selectQueryDel);
    for(var i=0; i<data.length; i++){
        let item = data[i];
        let currtimestamp = TableUpdate.timestampConverter(new Date());
        let Mdate = TableUpdate.formatDate(new Date(item.MDATE));
        let MTime = TableUpdate.formatTime(new Date(item.MTIME));
        //let IsInvoiced = TableUpdate.convertStrToBool(item.IsInvoiced);
        //let transactDate = TableUpdate.timestampConverter(new Date(item["TransactDate (UTC)"]));//; TableUpdate.timestampConverter(item["TransactDate (UTC)"]);
        let Quantity = TableUpdate.convertToFloat(item.MQUAN);
        
        let querydel = `delete from MY_ROICEAD_TANKINVENTORY where ID = '${item.ID}' and Site = '${item["Site"]}' and TankNum = '${item["TankNum"]}'`;
        await connectn.executeUpdate(querydel);
        let insertQuery = TableUpdate.generateInsertQuery(item, selectQueryData.columnInfo, 'MY_ROICEAD_TANKINVENTORY');
        insertQuery =  insertQuery.replace(/undefined/g, null);
        try {
            await connectn.executeUpdate(insertQuery);
        }catch(e){
            console.log(e.message);
        }
        
    }
    connectn.commit();
},

formatDate :  function (date) {
		var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();

		var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
        
        var yy = date.getFullYear() ;
       
        
        //let hours = "0" + Math.floor(Math.random() * 10);
 	
		return ( yy + "-" + MM + "-" + dd );
	},
formatTime :   function	 (date){
		 var hh = (date.getHours() < 10 ? '0' : '') + date.getHours();

		var min = ((date.getMinutes() + 1) < 10 ? '0' : '') + (date.getMinutes() + 1);
		var sec = '00';//((date.getSeconds()() + 1) < 10 ? '0' : '') + (date.getSeconds() + 1);
		return ( hh + ":" + min + ":" + sec );
	},
timestampConverter : function (date){
 	let formatteddate = TableUpdate.formatDate(date);
 	let time = TableUpdate.formatTime(date);
 	//date.setTime("00");
 //	let datenum = date.get
    return ( formatteddate + "T" + time )  ;
  },

 convertStrToBool : function (stringval) {
      if(stringval === '1')
      {
        return true;
      } else   {return false;}
      
  },
 convertToFloat : function (val){
      return parseFloat(val).toFixed(2);
  }
}
export default TableUpdate;