

module.exports = (srv)=>{ // `srv` is the instance of cds.Service
    srv.after ('CREATE', 'MeterReadings', _recalcOverflow)
     //srv.on ('READ', 'ReplenishmentOrderCreated', _getReplOrdersCreated)
   async function _recalcOverflow (req) {
     console.log("Test" + req.data);
     const reading = req.data
     //select(MeterReadings).where({MeasureDate <= reading.MeasureDate})
     console.log(req.data);
   }
 
   srv.on("UploadTableData", async (req) => {
     let tabName = 'MY_ROICEAD_' + req.data.tablename;
     let data = JSON.parse(req.data.data);
     const {Drawings} = srv.entities();
     const tx = cds.transaction(req);
     
     if(req.data.tableName === 'Drawings'){
         for(var i=0; i< data.length; i++){
             let item = data[i];
             item.TransactDate = timestampConverter(new Date(item.TransactDate));
             item.IsConfirmed = convertStrToBool(item.IsConfirmed);
             item.IsInvoiced = convertStrToBool(item.IsInvoiced);
             let delquery = `delete from ${tabName} where TransactId = '${item.TransactId}'`;
             await tx.run(delquery);
             await tx.run (INSERT(item).into(Drawings))
         }
     }
     if(req.data.tabName === 'POSHeader'){
         for(var i=0; i< data.length; i++){
             let item = data[i];
             item.TransactDate = timestampConverter(new Date(item.TransactDate));
             item.IsConfirmed = convertStrToBool(item.IsConfirmed);
             item.IsInvoiced = convertStrToBool(item.IsInvoiced);
             let delquery = `delete from ${tabName} where TransactId = '${item.TransactId}'`;
             await tx.run(delquery);
             await tx.run (INSERT(item).into(Drawings))
         }
     }
     
   });
 
   const timestampConverter = function(date){
     //return dateformatter.format(date, "YYYY-MM-DD HH:MM:SS");
     return date.toISOString().replace("T"," ").substring(0, 19);
   }
 
   const convertStrToBool = function (stringval) {
       if(stringval.toLowerCase() === 'yes')
       {
         return true;
       } else   {return false;}
       
   }
   
 }