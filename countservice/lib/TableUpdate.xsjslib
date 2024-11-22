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
	for(var i=0; i< data.length; i++){
            let item = data[i];
            let AMOUNT = convertToFloat(item.AMOUNT);
            let insertq = `INSERT INTO MY_ROICEAD_SITEPOSITEMS VALUES(
				'${item.SiteTrnID}',
				'${item.SiteTrnItem}',
                
				'${item.QUANTITIY}',
				'${item.UOM}',
				'${item.UNIT_PRICE}',
				${AMOUNT},
				'${item.CURRENCY}',
				'${item.VAT_PERC}',
                '${item["MATERIAL/MaterialId"]}'
				
			)` ;
				let querydel = `delete from MY_ROICEAD_SITEPOSITEMS where SiteTrnID = '${item.SiteTrnID}' and SiteTrnItem = '${item.SiteTrnItem}'`;
				insertq =  insertq.replace(/undefined/g, "");
				await connectn.executeUpdate(querydel);
				await connectn.executeUpdate(insertq);
	}    
    await connectn.commit();    
},
insertPosHeader : async function (data) {
	for(var i=0; i< data.length; i++){
            let item = data[i];
            item.TransactDate = TableUpdate.timestampConverter(new Date(item.TransactDate));
            item.IsConfirmed = convertStrToBool(item.IsConfirmed);
            item.IsInvoiced = convertStrToBool(item.IsInvoiced);
            // let delquery = `delete from ${tabName} where TransactId = '${item.TransactId}'`;
            // await tx.run(delquery);
            // await tx.run (INSERT(item).into(Drawings))
        let insertq = `INSERT INTO MY_ROICEAD_SITEPOSHEADER VALUES(
						'${item.SiteTrnID}'/*SITETRNID <NVARCHAR(10)>*/,
						'${item.SYS_AUDIT_NO}'/*SYS_AUDIT_NO <NVARCHAR(10)>*/,
						'${item["TRN_TIMESTAMP (UTC)"]}'/*TRN_TIMESTAMP <TIMESTAMP>*/,
						'${item.TRN_TZONE}'/*TRN_TZONE <NVARCHAR(5)>*/,
						'${item.TERMINAL_ID}'/*TERMINAL_ID <NVARCHAR(15)>*/,
						'${item.TERMINAL_TYPE}'/*TERMINAL_TYPE <NVARCHAR(10)>*/,
						'${item.TRN_TYPE}'/*TRN_TYPE <NVARCHAR(10)>*/,
						'${item.TRN_APPROVED}'/*TRN_APPROVED <NVARCHAR(10)>*/,
						'${item.AUTH_CODE}'/*AUTH_CODE <NVARCHAR(10)>*/,
						${item.TRANS_AMOUNT}/*TRANS_AMOUNT <DECIMAL>*/,
						'${item.CURRENCY}'/*CURRENCY <NVARCHAR(6)>*/,
						'${item.BATCH_SEQ}'/*BATCH_SEQ <NVARCHAR(10)>*/,
						'${item.MOP_TYPE}'/*MOP_TYPE <NVARCHAR(10)>*/,
						'${item.CARD_TYPE}'/*CARD_TYPE <NVARCHAR(10)>*/,
						'${item.CARD_PAN}'/*CARD_PAN <NVARCHAR(20)>*/,
						'${item.CARD_PAN_ENTRY}'/*CARD_PAN_ENTRY <NVARCHAR(10)>*/,
						'${item.CARD_TRACK_DATA}'/*CARD_TRACK_DATA <NVARCHAR(50)>*/,
						'',
						''/*REGTIME <TIME>*/,
						'${item.RegUser}'/*REGUSER <NVARCHAR(50)>*/,
						'${item["Site/Site"]}'/*SITE_SITE <NVARCHAR(10)>*/,
						'${item["Site/SiteType"]}'/*SITE_SITETYPE <NVARCHAR(5)>*/
				)` ;
				let querydel = `delete from MY_ROICEAD_SITEPOSHEADER where SiteTrnID = '${item.SiteTrnID}'`;
				insertq =  insertq.replace(/undefined/g, "");
				await connectn.executeUpdate(querydel);
				await connectn.executeUpdate(insertq);
       }
       await connectn.commit();
},
insertInDrawings : async function (data){
    for(var i=0; i<data.length; i++){
        let item = data[i];
        let IsConfirmed = convertStrToBool(item.IsConfirmed);
        let IsInvoiced = convertStrToBool(item.IsInvoiced);
        let transactDate = TableUpdate.timestampConverter(new Date(item["TransactDate (UTC)"]));//; TableUpdate.timestampConverter(item["TransactDate (UTC)"]);
        let Quantity = convertToFloat(item.Quantity);
        let querydel = `delete from MY_ROICEAD_DRAWINGS where TransactId = '${item.TransactId}'`;
        await connectn.executeUpdate(querydel);
        if(!item["Pump"]){
        	item["Pump"] = '';
        }
        let insertq = `INSERT INTO MY_ROICEAD_DRAWINGS VALUES(
            '${item.TransactId}',
            '${item.StationId}',
            '${item.StationAddress}',
            '${item["Pump"]}',
            '${item.Terminal}',
            '${item.AuthorizationID}',
            '${item.ReceiptNo}',
            ${IsConfirmed},
            ${IsInvoiced},
            '${transactDate}',
            '${item.Product}',
            ${Quantity},
            '${item.QuantityUOM}',
            ${item.Price},
            '${item.PriceType}',
            '${item.PriceCurrency}',
            ${item.NetValue},
            ${item.GrossValue},
            '${item.ValueCurrency}',
            '${item.VatPercent}',
            '${item.VatValue}',
            '${item["Card/CardNum"]}'
        )`;
        insertq =  insertq.replace(/undefined/g, "");
        await connectn.executeUpdate(insertq);
    }
    await connectn.commit();
},

insertTankInventoryData : async function (data){
    for(var i=0; i<data.length; i++){
        let item = data[i];
        let currtimestamp = TableUpdate.timestampConverter(new Date());
        let Mdate = TableUpdate.formatDate(new Date(item.MDATE));
        let MTime = TableUpdate.formatTime(new Date(item.MTIME));
        //let IsInvoiced = convertStrToBool(item.IsInvoiced);
        //let transactDate = TableUpdate.timestampConverter(new Date(item["TransactDate (UTC)"]));//; TableUpdate.timestampConverter(item["TransactDate (UTC)"]);
        let Quantity = convertToFloat(item.MQUAN);
        
        let querydel = `delete from MY_ROICEAD_TANKINVENTORY where ID = '${item.ID}' and Site = '${item["Site"]}' and TankNum = '${item["TankNum"]}'`;
        await connectn.executeUpdate(querydel);
        
        let insertq = `INSERT INTO MY_ROICEAD_TANKINVENTORY VALUES(
            '${currtimestamp}',
            'dimitris.pagonis@roicead.com',
            '${currtimestamp}',
            'dimitris.pagonis@roicead.com',
            '${item["ID"]}',
            '${item["Site"]}',
            '${item["TankNum"]}',
            '${Mdate}',
            '${MTime}',
            '${item["MTYPE"]}',
            '${item["MTZONE"]}',
            '${item["MaterialId"]}',
            '${item["MaterialDesc"]}',
            '${item["MFLEVEL"]}',
            '${item["MFUOM"]}',
            ${Quantity},
            '${item["MQUOM"]}',
            '${Mdate}',
            '${MTime}',
            'dimitris.pagonis'
        )`;
        insertq =  insertq.replace(/undefined/g, "");
        await connectn.executeUpdate(insertq);
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