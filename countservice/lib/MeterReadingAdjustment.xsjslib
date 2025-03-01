var connectn = await $.hdb.getConnection();
var MeterReadingAdjustment = {
adjustMeterReading : async function (content){
	var record = JSON.parse(content);
	await MeterReadingAdjustment.insertRecord(record);
	var resp = await MeterReadingAdjustment.updateMeterReadings(record);
	return "Data Record is successfully Saved";
},
updateMeterReadings : async function (record){
	var meterReadingsQuery =	"SELECT * FROM MY_ROICEAD_METERREADINGS AS TI  WHERE TI.Site = '" + record.Site + "' and TI.MeterNum = '" + record.MeterNum  + "'" + " and TI.MeasureDate >= '" + record.MeasureDate + "' " + " ORDER BY TI.MeasureDate"		;			
		var meterReadingsRes = 	await connectn.executeQuery(meterReadingsQuery);	
		
		for(var m = 1; m<(meterReadingsRes.length ); m++ ){
			var currRead = parseFloat(meterReadingsRes[m].MREADING);
			var prevRead = parseFloat(meterReadingsRes[m-1].MREADING);
			if((currRead - prevRead ) > 0){
						var mquan = (currRead - prevRead ) * parseFloat(meterReadingsRes[m].METERFACTOR);
						if(meterReadingsRes[m].MQUANTITY !== mquan){
							meterReadingsRes[m].MQUANTITY = mquan.toFixed(2) ;
							meterReadingsRes[m].MOVERFLOW = false;
							await MeterReadingAdjustment.updRecord(meterReadingsRes[m]);
						}
						
					}else{
						meterReadingsRes[m].MOVERFLOW = true;
						var maxRead = parseFloat(record.maxRead);
						var mquan = (record.maxRead - prevRead) + (currRead);
						if(meterReadingsRes[m].MQUANTITY !== mquan){
							meterReadingsRes[m].MQUANTITY = mquan.toFixed(2) ;
							meterReadingsRes[m].MOVERFLOW = true;
							await MeterReadingAdjustment.updRecord(meterReadingsRes[m]);
						}
					}
					
		}
		
},
updRecord : async function  (record){
	var sql = "UPDATE MY_ROICEAD_METERREADINGS SET MQUANTITY = '" + record.MQUANTITY + "', MOVERFLOW = " + record.MOVERFLOW + " WHERE ID = '" + record.ID + "'" ;
	console.log(sql);
	await connectn.executeUpdate(sql);
	await connectn.commit(); 
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
insertRecord : async function  (record){
	var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = MeterReadingAdjustment.formatDateTime(currTstmpResult[0].CURRENT_TIMESTAMP);
		
	var sql = "INSERT INTO MY_ROICEAD_METERREADINGS VALUES( " +
    "'" + currTstmp + "', " + // CREATEDAT <TIMESTAMP>
    "'D.Pagonis', " + // CREATEDBY <NVARCHAR(255)>
    "'" + currTstmp + "', " + // MODIFIEDAT <TIMESTAMP>
    "'D.Pagonis', " + // MODIFIEDBY <NVARCHAR(255)>
    "'" + record.ID + "', " + // ID <NVARCHAR(10)>
    "'" + record.Site + "', " + // SITE <NVARCHAR(10)>
    "'" + record.MeterNum + "', " + // METERNUM <NVARCHAR(10)>
    "'" + record.SITETYPE + "', " + // SITETYPE <NVARCHAR(5)>
    "'" + record.MeasureDate + "', " + // MEASUREDATE <TIMESTAMP>
    "'" + record.MTYPE + "', " + // MTYPE <NVARCHAR(5)>
    "'" + record.MTZONE + "', " + // MTZONE <NVARCHAR(4)>
    "'" + record.MaterialId + "', " + // MATERIALID <NVARCHAR(18)>
    "'" + record.MaterialDesc + "', " + // MATERIALDESC <NVARCHAR(40)>
    "'" + record.MREAD_ENTRY + "', " + // MREAD_ENTRY <NVARCHAR(25)>
    "'" + record.MREADING + "', " + // MREADING <NVARCHAR(25)>
    "'" + record.MQUANTITY + "', " + // MQUANTITY <NVARCHAR(25)>
    (record.MOVERFLOW ? 'TRUE' : 'FALSE') + ", " + 
    "'" + record.MeterFactor + "', " + // METERFACTOR <NVARCHAR(5)>
    "'" + record.MFLEVEL + "', " + // MFLEVEL <NVARCHAR(10)>
    (record.MFUOM ? "'" + record.MFUOM + "'" : "NULL") + ", " +
    "'" + record.Regdate + "', " + // REGDATE <DATE>
    "'" + record.RegTime + "', " + // REGTIME <TIME>
    "'" + record.RegUser + "'" + // REGUSER <NVARCHAR(50)>
")";
	console.log(sql);
	await connectn.executeUpdate(sql);
	await connectn.commit(); 


}
};
export default MeterReadingAdjustment;