var connectn;
$.hdb.getConnection({}, function(err, client) {
    if (err) {
        // Handle error
        console.error("Error getting HANA DB connection:", err);
        return;
    }
    connectn = client;
    
});
async function adjustMeterReading(content){
	var record = JSON.parse(content);
	await insertRecord(record);
	var resp = await updateMeterReadings(record);
	return "Data Record is successfully Saved";
}
async function updateMeterReadings(record){
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
							await updRecord(meterReadingsRes[m]);
						}
						
					}else{
						meterReadingsRes[m].MOVERFLOW = true;
						 maxRead = parseFloat(record.maxRead);
						var mquan = (record.maxRead - prevRead) + (currRead);
						if(meterReadingsRes[m].MQUANTITY !== mquan){
							meterReadingsRes[m].MQUANTITY = mquan.toFixed(2) ;
							meterReadingsRes[m].MOVERFLOW = true;
							await updRecord(meterReadingsRes[m]);
						}
					}
					
		}
		
}
async function updRecord (record){
	var sql = "UPDATE MY_ROICEAD_METERREADINGS SET MQUANTITY = '" + record.MQUANTITY + "', MOVERFLOW = " + record.MOVERFLOW + " WHERE ID = '" + record.ID + "'" ;
	await connectn.executeUpdate(sql);
	await connectn.commit(); 
}
function formatDateTime(date) {
		var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();

		var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
		var HH = (date.getHours() < 10 ? '0' : '') + date.getHours();
		var Min = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
		var SS = (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
		var time = (HH + ":" + Min + ":" + SS);
		var dateformatted = date.getFullYear() + "-" + MM + "-" + dd + "T" + time;
		return (dateformatted);
	}
async function insertRecord (record){
	var currTimestampQuery = 'SELECT CURRENT_TIMESTAMP  FROM DUMMY';
		var currTstmpResult = await connectn.executeQuery(currTimestampQuery);
		var currTstmp = formatDateTime(currTstmpResult[0].CURRENT_TIMESTAMP);
	var sql = "INSERT INTO MY_ROICEAD_METERREADINGS VALUES( '" + 
	record.ID + "' , '"  +
	record.Site + "' , '"  +
	record.MeterNum + "' , '"  +
	record.SITETYPE + "' , '"  +
	record.MeasureDate + "' , '"  +
	record.MTYPE + "' , '"  +
	record.MTZONE + "' , '"  +
	record.MaterialId + "' , '"  +
	record.MaterialDesc + "' , '"  +
	record.MREAD_ENTRY + "' , '"  +
	record.MREADING + "' , "  +
	record.MOVERFLOW + " , '"  +
	record.MeterFactor + "' , '"  +
	record.MFLEVEL + "' , '"  +
	record.MFUOM + "' , '"  +
	record.Regdate + "' , '"  +
	record.RegTime + "' , '"  +
	record.RegUser + "' , '"  +
	record.MQUANTITY + "' , '"  +
	currTstmp + "' , 'D.Pagonis' , '"  +
	currTstmp + "' , 'D.Pagonis' )" ;

	await connectn.executeUpdate(sql);
	await connectn.commit(); 


}