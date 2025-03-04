using { my.roicead } from '../db/data-model';
service CardService {
    entity Cards as projection on roicead.Cards;
    entity Drawings as projection on roicead.Drawings;
    entity Variants as projection on roicead.Variants;
    entity BusinessPartner as projection on roicead.BusinessPartner;
    entity SiteDetails as projection on roicead.SiteDetails;
    entity Materials as projection  on roicead.Materials;
    entity Tanks as projection on roicead.Tanks;
    entity MaterialAllocation as projection on roicead.MaterialAllocation;
    entity TankInventory as projection on roicead.TankInventory;
    entity Meters as projection on roicead.Meters;
    entity MeterMaterialAllocation as projection on roicead.MeterMaterialAllocation;
    entity MeterTankAllocation as projection on roicead.MeterTankAllocation;
    entity MeterReadings as projection on roicead.MeterReadings;
    @cds.redirection.target:true
    entity MetersInventory as projection on roicead.MeterReadings;
    entity Reconciliation as projection on roicead.MeterReconciliation;
	entity ForecastCalculation as projection on roicead.ForecastCalculation;
    entity DemandForecast as projection on roicead.DemandForecast;
    entity forecastDemand as projection on roicead.forecastDemand;
    entity SitePosDetails as projection on roicead.SitePosHeader;
    entity SitePosItems as projection on roicead.SitePosItems;
	entity SiteTimings as projection on roicead.SiteTimings;
    entity SiteSalesProfile as projection on roicead.SiteSalesProfile;
    entity SiteProfileAllocation as projection on roicead.SiteProfileAllocation;
    entity PublicHolidayProfile as projection on roicead.PublicHolidayProfile;
	entity ReplenishmentOrders as projection on roicead.ReplenishmentOrders;
	entity CreatedReplOrders as projection on roicead.CreatedReplOrders;
    entity InventoryData as projection on roicead.INVENTORYDATA1;
    entity TankInventoryVol as projection on roicead.VOLAGG;
    entity AggByVolume as projection on roicead.AggByVolume;
    entity VOLBYPROD as projection on roicead.VOLBYPROD;
    entity CRITICALTANK as projection on roicead.CRITICALTANK;
    entity CARDSANALYTICS as projection on roicead.C_CARDS;
    entity ACTIVECARDS as projection on roicead.ACTIVECARDSCOUNT;
    entity SalesByProd as projection on roicead.SalesByProd;
    entity SalesByCards as projection on roicead.SalesByCards;
    entity SalesByCardNum as projection on roicead.SALESBYCARD;
    entity COUNTBYSALESNTRANS as projection on roicead.COUNTBYSALESNTRANS;
    entity SalesPerMonthByProd as projection on roicead.SALESPERMONTHBYPRODS;
    entity POSSalesY2D as projection on roicead.POSSalesY2D;
    entity Orders as projection on roicead.Orders;
    entity PriorityOrders as projection on roicead.PriorityOrders;
    entity POSSales as projection on roicead.POSSales;
    entity POSANALYTICS as projection on roicead.POSANALYTICS;
    entity POSBYMATGRPVIEW as projection on roicead.POSBYMATGRPVIEW;
    entity POSBYPRIMNW as projection on roicead.POSBYPRIMNW;
    entity POSBYPRIMNWBYYEAR as projection on roicead.POSBYPRIMNWBYYEAR;
    entity POSBYMATGRPYEARLY as projection on roicead.POSBYMATGRPYEARLY;
    entity POSBYMOP as projection on roicead.POSBYMOP;
    entity POSBYSITE as projection on roicead.POSBYSITE;
    action UploadTableData(tablename : String, data : LargeString) ;
    
}
