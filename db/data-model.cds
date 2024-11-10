using {
    managed,
    sap
} from '@sap/cds/common';

namespace my.roicead;

entity Cards {
    key CardNum       : String(20);
        SupplierName  : String(40);
        TypeName      : String(20);
        Driver        : String(40);
        VehRegNum     : String(15);
        Customer      : String(10);
        CustomerName  : String(40);
        SalesOrgName  : String(20);
        SalesOffName  : String(20);
        Status        : String(10);
        ExpiryDate    : Timestamp;
        BlockDate     : Timestamp;
        BlockReason   : String(20);
        CancelDate    : Timestamp;
        CancelReason  : String(20);
        IssueDate     : Timestamp;
        OrigIssueDate : Timestamp;
        Bpno          : String(10);
        Drawings      : Association to many Drawings
                            on Drawings.Card = $self;
};

entity Drawings {
   
    key TransactId      : String(20);
        Card            : Association to Cards;
        StationId       : String(10);
        StationAddress  : String(60);
        Pump            : String(3);
        Terminal        : String(5);
        AuthorizationID : String(10);
        ReceiptNo       : String(5);
        IsConfirmed     : Boolean;
        IsInvoiced      : Boolean;
        TransactDate    : Timestamp;
        Product         : String(20);
        Quantity        : Decimal(5, 2);
        QuantityUOM     : String(3);
        Price           : Decimal(5, 2);
        PriceType       : String(20);
        PriceCurrency   : String(3);
        NetValue        : Decimal(5, 2);
        GrossValue      : Decimal(13, 2);
        ValueCurrency   : String(3);
        VatPercent      : String(5);
        VatValue        : String(5);
};

entity Variants {
    key VariantId         : String(15);
        Username          : String(40);
        appName           : String(10);
        CardToken         : String(300);
        Token3            : String(300);
        Token4            : String(300);
        Token5            : String(300);
        isDefault         : Boolean;
        isApplyAuto       : Boolean;
        VaraintName       : String(15);
        TransToken        : String(300);
        searchString      : String(30);
        ConfirmedDarwings : String(30);
        productSearch     : String(30);
};

entity BusinessPartner {
    key Bpno        : String(10);
    key BpType      : String(4);
        Ext_Bp      : String(35);
        Acronym     : String(20);
        Name1       : String(35);
        Name2       : String(35);
        Name3       : String(35);
        Name4       : String(35);
        Street1     : String(35);
        Street2     : String(35);
        HouseNum    : String(6);
        Floor       : String(3);
        City        : String(35);
        District    : String(35);
        Country     : String(18);
        Langu       : String(3);
        ZipCode     : String(10);
        Phone       : String(35);
        Mobile      : String(35);
        Email       : String(50);
        ContactName : String(35);
        Role        : String(35);
        Job         : String(35);
        Dptmt       : String(35);
        ValidFrom   : Date;
        ValidTo     : Date;
        Status      : String(10);
        Regdate     : Date;
        RegTime     : Time;
        RegUser     : String(50);
};

@cds.odata.valuelist
entity SiteDetails {
    key Site                  : String(10);
    key SiteType              : String(5);
        Ext_Bp                : String(35);
        Acronym               : String(35);
        Name1                 : String(35);
        Name2                 : String(35);
        Name3                 : String(35);
        Name4                 : String(35);
        Street1               : String(35);
        Street2               : String(35);
        HouseNum              : String(6);
        Floor                 : String(3);
        City                  : String(35);
        District              : String(35);
        Country               : String(18);
        Langu                 : String(3);
        ZipCode               : String(10);
        Phone                 : String(35);
        Mobile                : String(35);
        Email                 : String(50);
        ContactName           : String(35);
        Role                  : String(35);
        Job                   : String(35);
        Dptmt                 : String(35);
        ValidFrom             : Date;
        ValidTo               : Date;
        Latitude              : String(13);
        Longitude             : String(13);
        Status                : String(10);
        Regdate               : Date;
        RegTime               : Time;
        RegUser               : String(50);
        PrimaryNetwork        : String(50);
        SubNetwork            : String(50);
        LocationGroup         : String(50);
        SiteTimings           : Association to many SiteTimings
                                    on SiteTimings.Site = Site;
        SiteProfileAllocation : Association to many SiteProfileAllocation
                                    on SiteProfileAllocation.Site = Site;
        Tanks                 : Association to many Tanks
                                    on Tanks.Site = Site;
        Meters                : Association to many Meters
                                    on Meters.Site = Site;
};

entity SiteTimings : managed {
    key counter    : UUID;
        Site       : String(10);
        Hours_Type : String(10);
        Hours_Day  : String(14);
        Day_no     : Integer;
        Hours_From : Time;
        Hours_To   : Time;
        flag_24_7  : Boolean;
};

entity SiteSalesProfile {
    key Profile       : String(10);
    key Profile_Time  : String(12);
        Monday        : String(6);
        Tuesday       : String(6);
        Wednesday     : String(6);
        Thursday      : String(6);
        Friday        : String(6);
        Saturday      : String(6);
        Sunday        : String(6);
        PublicHoliday : String(6);
};

entity PublicHolidayProfile {
    key Profile      : String(10);
    key Profile_Date : Date;
        Description  : String(50);

};

entity SiteProfileAllocation {
    key Profile              : String(10);
    key Counter              : String(10);
        Site                 : String(10);
        TankNum              : String(10);
        Profile_Type         : String(16);
        Description          : String(50);
        Allocat_Desc         : String(50);
        Date_From            : Date;
        Date_To              : Date;
        SiteSalesProfile     : Association to many SiteSalesProfile
                                   on SiteSalesProfile.Profile = Profile;
        PublicHolidayProfile : Association to many PublicHolidayProfile
                                   on PublicHolidayProfile.Profile = Profile;
};

@Capabilities                               : {
    Insertable : true,
    Deletable  : false,
    Updatable  : true
}
@Capabilities.SearchRestrictions.Searchable : true
entity Materials {
        @Search.defaultSearchElement : true
    key MaterialId    : String(18);
        @Search.defaultSearchElement : true
        MaterialDesc  : String(40);
        @Search.defaultSearchElement : true
        MaterialCode  : String(18);
        MaterialGroup : String(25);
        MaterialCategory : String(30);
        Regdate       : Date;
        RegTime       : Time;
        @odata.on.insert             : #user
        RegUser       : String(128);
        Materials     : Association to many MaterialAllocation
                            on Materials.MaterialId = $self;
};

entity Tanks {
    key Site           : String(10);
    key SiteType       : String(5);
    key TankNum        : String(10)@filterable;
        Soc_Class      : String(20);
        Tank_Grp       : String(5);
        Maxcap_vol     : Decimal(8, 2);
        Topsafe_vol    : Decimal(8, 2);
        Tarlvl_vol     : Decimal(8, 2);
        ORDLVL_VOL     : Decimal(8, 2);
        BTMSAF_VOL     : Decimal(8, 2);
        UNPCAP_VOL     : Decimal(8, 2);
        TARLVL_HRS     : Time;
        ORDLVL_HRS     : Time;
        BTMASF_HRS     : Time;
        MAX_UTLZ       : String(7);
        LENGTH         : Decimal(5, 2);
        DIAMTR         : Decimal(5, 2);
        WEIGHT         : Decimal(7, 2);
        EQPMT_NO       : String(15);
        FUNCTLOC       : String(15);
        Bpno           : String(10);
        BpType         : String(4);
        DRAWNO         : String(20);
        SERIAL         : String(20);
        MODEL          : String(20);
        CONST_MONTH    : String(2);
        CONST_YEAR     : String(4);
        VolUOM         : String(3);
        MassUOM        : String(3);
        DimUOM         : String(5);
        Status         : String(10);
        Regdate        : Date;
        RegTime        : Time;
        RegUser        : String(50);
        Material       : Association to many MaterialAllocation
                             on  Material.Site     = Site
                             and Material.TankNum  = TankNum
                             and Material.SiteType = SiteType;
        Inventory      : Association to many TankInventory
                             on  Inventory.Site    = Site
                             and Inventory.TankNum = TankNum;
        Reconciliation : Association to many MeterReconciliation
                             on  Reconciliation.Site    = Site
                             and Reconciliation.TankNum = TankNum;
};

entity MaterialAllocation {
    key Site       : String(10);
    key SiteType   : String(5);
    key TankNum    : String(10);
    key Valid_from : Date;
    key MaterialId : Association to Materials;
        Reason     : String(30);
        Regdate    : Date;
        RegTime    : Time;
        RegUser    : String(50);
        TankGrp    : Association to many Tanks
                         on TankGrp.Site = Site;
};

entity TankInventory : managed {
    key ID           : String(10);
    key Site         : String(10);
    key TankNum      : String(10);
        MDATE        : Date;
        MTIME        : Time;
        MTYPE        : String(5);
        MTZONE       : String(4);
        MaterialId   : String(18);
        MaterialDesc : String(40);
        MFLEVEL      : String(10);
        MFUOM        : String(3);
        MQUAN        : Decimal(15, 2);
        MQUOM        : String(3);
        Regdate      : Date;
        RegTime      : Time;
        RegUser      : String(50);
};

entity Meters {
    key Site          : String(10);
    key SiteType      : String(5);
    key MeterNum      : String(10);
        MeterDesc     : String(20);
        MeterFactor   : String(10);
        NumOfDigits   : String(4);
        NumOfDecimals : String(5);
        MFUOM         : String(3);
        Status        : String(10);
        EQPMT_NO      : String(15);
        FUNCTLOC      : String(15);
        Bpno          : String(10);
        BpType        : String(4);
        DRAWNO        : String(20);
        SERIAL        : String(20);
        MODEL         : String(20);
        CONST_MONTH   : String(2);
        CONST_YEAR    : String(4);
        RecalibDate   : Timestamp;
        Regdate       : Date;
        RegTime       : Time;
        RegUser       : String(50);
        Inventory     : Association to many MeterReadings
                            on  Inventory.Site     = Site
                            and Inventory.MeterNum = MeterNum;
        Material      : Association to many MeterMaterialAllocation
                            on  Material.Site     = Site
                            and Material.MeterNum = MeterNum
                            and Material.SiteType = SiteType;
        AllotedTanks  : Association to many MeterTankAllocation
                            on  AllotedTanks.Site     = Site
                            and AllotedTanks.MeterNum = MeterNum;
};

entity MeterMaterialAllocation {
    key Site       : String(10);
    key SiteType   : String(5);
    key MeterNum   : String(10);
    key Valid_from : Date;
    key MaterialId : Association to Materials;
        Reason     : String(30);
        Regdate    : Date;
        RegTime    : Time;
        RegUser    : String(50);
        MeterGrp   : Association to many Meters
                         on MeterGrp.Site = Site;
};

entity MeterTankAllocation {
    key Site       : String(10);
    key SiteType   : String(5);
    key MeterNum   : String(10);
    key Valid_from : Date;
        TankNum    : String(10);
        Reason     : String(30);
        Regdate    : Date;
        RegTime    : Time;
        RegUser    : String(50);

};

entity MeterReadings : managed {
    key ID           : String(10);
    key Site         : String(10);
    key MeterNum     : String(10);
        SiteType     : String(5);
        MeasureDate  : Timestamp;
        MTYPE        : String(5);
        MTZONE       : String(4);
        MaterialId   : String(18);
        MaterialDesc : String(40);
        MREAD_ENTRY  : String(25);
        MREADING     : String(25);
        MQUANTITY    : String(25);
        MOVERFLOW    : Boolean;
        MeterFactor  : String(5);
        MFLEVEL      : String(10);
        MFUOM        : String(3);
        Regdate      : Date;
        RegTime      : Time;
        RegUser      : String(50);
};

entity MeterReconciliation : managed {
    key ID                 : String(10);
    key Site               : String(10);
    key TankNum            : String(10);
    key SiteType           : String(5);
        MaterialId         : String(18);
        MaterialDesc       : String(40);
        ReconcDate         : Timestamp;
        MTZONE             : String(4);
        MFUOM              : String(3);
        InventoryStartQty  : String(25);
        SupplyQty          : String(25);
        isSupplyQtyChanged : Boolean;
        MQUANTITY          : String(25);
        isMQUANTITYChanged : Boolean;
        InventoryEndQty    : String(25);
        isInventoryChanged : Boolean;
        DiffQty            : String(25);
        DiffPercent        : String(25);
        Comments           : String(100);
        ReconcType         : String(5);
        Regdate            : Date;
        RegTime            : Time;
        RegUser            : String(50);
};

entity ForecastCalculation : managed {
    key Site                : String(10);
    key Tank                : String(10);
    key Forecast_date       : Date;
    key Forecast_time       : Time;
    key Entry_Type          : String(10);
        Material            : String(10);
        Tank_Grp            : String(10);
        Critical_Tank       : Boolean;
        Profile_Day         : String(15);
        Profile_PHD         : String(10);
        Profile             : String(10);
        Profile_Type        : String(10);
        Factor              : String(6);
        Forecast_Qty        : Decimal(8, 2);
        Forecast_Inv        : Decimal(8, 2);
        Forecast_Evt        : String(5);
        ForecastedTimestamp : Timestamp;

};
entity DemandForecast : managed {
    key Site                : Association to SiteDetails;
    key Tank                : String(10);
    key Forecast_date       : Date;
    key Forecast_time       : Time;
    key Entry_Type          : String(10);
        
        Forecast_Month      : String(20);
        
        Tank_Grp            : String(10);
        Critical_Tank       : Boolean;
        Profile_Day         : String(15);
        Profile_PHD         : String(10);
        Profile             : String(10);
        Profile_Type        : String(10);
        Factor              : String(6);
        @Analytics.Measure               : true
        @Aggregation.default             : #SUM
        Forecast_Qty        : Decimal(8, 2);
        Forecast_Inv        : Decimal(8, 2);
        Forecast_Evt        : String(5);
        ForecastedTimestamp : Timestamp;
        Uom                 : String(5);
        Material            : Association to Materials ;
       
        

};
@Aggregation.ApplySupported.PropertyRestrictions : true
@Search.searchable                               : true
entity forecastDemand                       @(cds.persistence.skip : 'always')     as
    select from DemandForecast {
        @Analytics.Dimension             : true
        @Search.searchable               : true
        key Site.Site @(title : 'Site'),
        @Analytics.Dimension             : true
        @Search.searchable               : true
         @Consumption.valueHelpDefinition : [{entity : {
                name    : 'SiteDetails',
                element : 'PrimaryNetwork'
            }}]
        key Site.PrimaryNetwork @(title : 'Primary Network'),
        @Analytics.Dimension             : true
        @Search.searchable               : true
        key Tank,
        key Forecast_date,
        key Forecast_time,
        key Entry_Type,
        
           
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Material.MaterialGroup     @(title : 'Material Group'),
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Material.MaterialDesc         @(title : 'Material Description'),
           @Analytics.Dimension             : true
            @Search.searchable               : true
            Material.MaterialCategory     @(title : 'Material Category'),
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Tank_Grp,
            Critical_Tank @(title : ''),
            Profile_Day @(title : ''),         
            Profile_PHD @(title : ''),
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Profile  @(title : 'Profile'),
            Profile_Type,
            Factor,
            @Analytics.Measure               : true
            @Aggregation.default             : #SUM
            Forecast_Qty                @(title : 'Forecast Demand')         : Decimal(13, 2),
            @Analytics.Measure               : true
            @Aggregation.default             : #SUM
            @Semantics.quantity.unitOfMeasure : 'Uom'
            Forecast_Inv          @(title : 'Forecast Inventory') :    Decimal(15, 2) ,
            @Analytics.Dimension             : true
            Forecast_Evt              @(title : 'Forecast Event')  ,
            @Analytics.Dimension             : true
            ForecastedTimestamp              @(title : 'Forecast Date Time'),
            @Analytics.Dimension             : true
            @EndUserText.label               : 'Month'
            Forecast_Month  @(title : 'Month') ,
            @Semantics.unitOfMeasure          : true
            Uom @(title : 'Unit') 
    };
entity SitePosHeader {

    key SiteTrnID       : String(10);
        Site            : Association to SiteDetails;
        SYS_AUDIT_NO    : String(10);
        TRN_TIMESTAMP   : Timestamp;
        TRN_TZONE       : String(5);
        TERMINAL_ID     : String(15);
        TERMINAL_TYPE   : String(10);
        TRN_TYPE        : String(10);
        TRN_APPROVED    : String(10);
        AUTH_CODE       : String(10);
        TRANS_AMOUNT    : Decimal(13, 2);
        CURRENCY        : String(6);
        BATCH_SEQ       : String(10);
        MOP_TYPE        : String(10);
        CARD_TYPE       : String(10);
        CARD_PAN        : String(20);
        CARD_PAN_ENTRY  : String(10);
        CARD_TRACK_DATA : String(50);
        Regdate         : Date;
        RegTime         : Time;
        RegUser         : String(50);
        Items           : Association to many SitePosItems
                              on Items.SiteTrnID = SiteTrnID;
};

entity SitePosItems {
    key SiteTrnID   : String(10);
    key SiteTrnItem : String(10);
        MATERIAL    : Association to Materials;
        QUANTITIY   : String(10);
        UOM         : String(5);
        UNIT_PRICE  : String(10);
        AMOUNT      : Decimal(15, 2);
        CURRENCY    : String(5);
        VAT_PERC    : String(10);
};

entity ReplenishmentOrders : managed {
    key OrderNo        : String(15);
    key Item           : String(6);
    key Status         : String(4);
        isStatusChgd   : Boolean;
        OrderType      : String(3);
        Site           : Association to SiteDetails;
        TankNum        : String(10);
        BpType         : String(4);
        Suppl_BP       : String(10);
        Suppl_Mat      : Association to Materials;
        Suppl_Qty      : Decimal(8, 2);
        Suppl_Uom      : String(10);
        Suppl_Date     : Timestamp;
        Suppl_Time     : String(10);
        Suppl_TimeZone : String(10);
        Suppl_Low_Tol  : String(10);
        Suppl_High_Tol : String(10);
        Suppl_Low_Qty  : String(10);
        Suppl_High_Qty : String(10);
        CutOff_Date    : Timestamp;
        CutOff_Time    : String(10);
        Regdate        : Date;
        RegTime        : Time;
        RegUser        : String(50);
};

@cds.persistence.exists
entity INVENTORYDATA1 {
    key Site                : String(10);
    key TankNum             : String(10);
        ID                  : String(10);
        MDATE               : Date;
        MTIME               : Time;
        MTYPE               : String(5);
        MTZONE              : String(4);
        MaterialId          : String(18);
        MaterialDesc        : String(40);
        @Aggregation.default : SUM
        MQUAN               : Decimal(15, 2);
        MQUOM               : String(3);
        @Aggregation.default : SUM
        Tarlvl_vol          : Decimal(15, 2);
        ORDLVL_VOL          : Decimal(15, 2);
        BTMSAF_VOL          : Decimal(15, 2);
        @Aggregation.default : SUM
        Maxcap_vol          : Decimal(15, 2);
        Topsafe_vol         : Decimal(15, 2);
        UNPCAP_VOL          : Decimal(15, 2);
        Name1               : String(35);
        Acronym             : String(35);
        Ext_Bp              : String(35);
        SiteType            : String(5);
        Inventory           : Association to many TankInventory
                                  on  Inventory.Site    = Site
                                  and Inventory.TankNum = TankNum;
        ForecastCalculation : Association to many ForecastCalculation
                                  on  ForecastCalculation.Site = Site
                                  and ForecastCalculation.Tank = TankNum;
}

@cds.persistence.exists
@Aggregation.ApplySupported.PropertyRestrictions : true
entity VOLAGG {
        MaterialDesc      : String(40);
        MQUAN             : Decimal(8, 2);
    key MQUOM             : String(3);
        @Aggregation.default : SUM
        Tarlvl_vol        : Decimal(8, 2);
        @Aggregation.default : SUM
        BTMSAF_VOL        : Decimal(8, 2);
        @Aggregation.default : SUM
        Maxcap_vol        : Decimal(8, 2);
        @Aggregation.default : SUM
        TargetVolPerecent : Decimal(8, 2);
        @Aggregation.default : SUM
        ActualVolPerecent : Decimal(8, 2);
}

@cds.persistence.exists
@Aggregation.ApplySupported.PropertyRestrictions : true
entity VOLBYPROD {
    key MaterialId             : String(18);
        MaterialDesc           : String(40)    @(title : 'Material');
        @Semantics.unitOfMeasure          : true
        MQUOM                  : String(3);
        @Semantics.quantity.unitOfMeasure : 'MQUOM'
        MQUAN                  : Decimal(13, 2)@(title : 'Inventory');
        @Semantics.quantity.unitOfMeasure : MQUOM
        Tarlvl_vol             : Decimal(13, 2)@(title : 'Target Vol');
        BTMSAF_VOL             : Decimal(13, 2);
        Maxcap_vol             : Decimal(13, 2);
        UNPCAP_VOL             : Decimal(13, 2);
        @Semantics.quantity.unitOfMeasure : 'MQUOM'
        TOTAL_MEASURED_VOL     : Decimal(13, 2);
        @Semantics.quantity.unitOfMeasure : 'MQUOM'
        TOTAL_TARLVL_VOL       : Decimal(13, 2);
        CALCULATEDPERCENT      : Decimal(5, 2) @(title : 'Inventory Percent');
        CURRENTUTIL_PERCENT    : Decimal(5, 2) @(title : 'Total Current Utilization');
        TARGETVOL_UTIL_PERCENT : Decimal(5, 2) @(title : 'Total Target Utilization');
        CURRENT_UTIL_VOL       : Decimal(5, 2) @(title : 'Current Utilization');
        TARGET_UTIL_VOL        : Decimal(5, 2) @(title : 'Target Utilization');
}

@cds.persistence.exists
@Aggregation.ApplySupported.PropertyRestrictions : true
entity CRITICALTANK {
    key Site                  : String(10);
    key TankNum               : String(10);
        MDATE                 : Date;
        MTIME                 : Time;
        MTYPE                 : String(5);
        MTZONE                : String(4);
        MaterialId            : String(18);
        MaterialDesc          : String(40);
        @Aggregation.default : SUM
        MQUAN                 : Decimal(8, 2);
        MQUOM                 : String(3);
        @Aggregation.default : SUM
        Tarlvl_vol            : Decimal(8, 2);
        ORDLVL_VOL            : Decimal(8, 2);
        BTMSAF_VOL            : Decimal(8, 2);
        @Aggregation.default : SUM
        Maxcap_vol            : Decimal(8, 2);
        Topsafe_vol           : Decimal(8, 2);
        UNPCAP_VOL            : Decimal(8, 2);
        Name1                 : String(35);
        Acronym               : String(35);
        Ext_Bp                : String(35);
        SiteType              : String(5);
        TANKANDSITE           : String(50);
        ACTUALVSTARGETPERCENT : Decimal(5, 2)@(title : 'Inventory Percent');
}

entity AggByVolume                                                         as
    select from VOLAGG {
        key MaterialDesc,
            sum(
                Tarlvl_vol
            ) as TargetVol : Decimal(8, 2),
            sum(
                MQUAN
            ) as ActualVol : Decimal(8, 2)
    }
    group by
        MaterialDesc;

@cds.persistence.exists
@Aggregation.ApplySupported.PropertyRestrictions : true
entity C_CARDS {
    key TYPENAME        : String(20)    @(title : 'Card Type');
        PRODUCT         : String(20);
        GROSSVALUE      : Decimal(13, 2)@(title : 'Sales');
        TOTALGROSSVALUE : Decimal(13, 2)@(title : 'Total Sales');
        VALUECURRENCY   : String(3)     @(title : 'Currency');
}

@cds.persistence.exists
@Aggregation.ApplySupported.PropertyRestrictions : true
entity ACTIVECARDSCOUNT {
    key TYPENAME           : String(20)@(title : 'Card Type');
        COUNTOFACTIVECARDS : Integer   @(title : 'Active Cards');
        TOTACTIVECARDS     : Integer   @(title : 'Total Active Cards');
}

@cds.persistence.exists
@Aggregation.ApplySupported.PropertyRestrictions : true
entity COUNTBYSALESNTRANS {
    key TYPENAME           : String(20)    @(title : 'Card Type');
        GROSSVALUE         : Decimal(13, 2)@(title : 'Sales');
        TOTALGROSSVALUE    : Decimal(13, 2)@(title : 'Total Sales');
        VALUECURRENCY      : String(3)     @(title : 'Currency');
        COUNTOFACTIVECARDS : Integer       @(title : 'Active Cards');
        COUNTOFTRANS       : Integer       @(title : 'Drawings');
}

@cds.persistence.exists
@Aggregation.ApplySupported.PropertyRestrictions : true
entity SALESBYCARD {
    key CARD_CARDNUM    : String(20)    @(title : 'Card');
        GROSSVALUE      : Decimal(13, 2)@(title : 'Sales');
        TOTALGROSSVALUE : Decimal(13, 2)@(title : 'Total Sales');
        VALUECURRENCY   : String(3)     @(title : 'Currency');
        COUNTOFTRANS    : Integer       @(title : 'No. of Drawings');
}

entity SalesByCards                                                        as
    select from C_CARDS {
        key TYPENAME             @(title : 'Card Type'),
            VALUECURRENCY        @(title : 'Currency')    : String(3),
            sum(
                TOTALGROSSVALUE
            ) as TOTALGROSSVALUE @(title : 'Total Sales') : Decimal(13, 2),
            sum(
                GROSSVALUE
            ) as GROSSVALUE      @(title : 'Sales')       : Decimal(13, 2)

    }
    group by
        TYPENAME,
        VALUECURRENCY;

entity SalesByProd                                                         as
    select from C_CARDS {
        key PRODUCT,
            VALUECURRENCY        @(title : 'Currency')    : String(3),
            sum(
                TOTALGROSSVALUE
            ) as TOTALGROSSVALUE @(title : 'Total Sales') : Decimal(13, 2),
            sum(
                GROSSVALUE
            ) as GROSSVALUE      @(title : 'Sales')       : Decimal(13, 2)
    }
    group by
        PRODUCT,
        VALUECURRENCY;

@cds.persistence.exists
@Aggregation.ApplySupported.PropertyRestrictions : true
entity SALESPERMONTHBYPRODS {
    key PRODUCT         : String(20)    @(title : 'Product');
        MONTH           : String(13)    @(title : 'Month');
        MONTHSBETWEEN   : Integer       @(title : 'Month Between');
        GROSSVALUE      : Decimal(13, 2)@(title : 'Sales');
        TOTALGROSSVALUE : Decimal(13, 2)@(title : 'Total Sales');
        VALUECURRENCY   : String(3)     @(title : 'Currency');
};

// @Aggregation.ApplySupported.PropertyRestrictions : true
// define view POSBYMATGRP @(cds.persistence.skip : 'always') as
//     select
//         key items.MATERIAL.MaterialGroup,
//             @Aggregation.default : SUM
//             items.AMOUNT,
//             items.CURRENCY,
//             YEAR(
//                 header.TRN_TIMESTAMP
//             ) as yearoftrn : String(4)
//     from SitePosItems as items
//     inner join SitePosHeader as header
//         on items.SiteTrnID = header.SiteTrnID;

// @Aggregation.ApplySupported.PropertyRestrictions : true
// entity POSBYPRIMNW  as
//     select
//         key header.Site.PrimaryNetwork as PrimaryNetwork,
//             @DefaultAggregation : #SUM
//             items.AMOUNT,
//             YEAR(
//                 header.TRN_TIMESTAMP
//             ) as yearoftrn : String(4)
        
//     from SitePosItems as items
//     inner join SitePosHeader as header
//         on items.SiteTrnID = header.SiteTrnID
//         group by PrimaryNetwork,yearoftrn;
// define view POSMATGRP as
//     select distinct
//         a.MaterialId,
//         a.MaterialGroup,

//         b.SiteTrnID,
//         b.AMOUNT,
//         b.CURRENCY
//     from Materials as a
//     inner join SitePosItems as b
//         on a.MaterialId = b.MATERIAL.MaterialId
//     ;
//  @cds.persistence.exists
//     @Aggregation.ApplySupported.PropertyRestrictions: true
//    entity POSBYMATGRP {
// 		key	MaterialGroup		: String(25);
//         key yearoftrans			: String(4);    
//             @Aggregation.default : SUM
// 			Amount				: Decimal(15,2); 			
//             CURRENCY            : String(6);
//    }
   @cds.persistence.exists
    @Aggregation.ApplySupported.PropertyRestrictions: true
   entity POSANALYTICS {
        key Site                : String(10);
			MaterialGroup		: String(25);
            PrimaryNetwork      : String(50);
            @Aggregation.default : SUM
			Amount				: Decimal(15,2);
   			YearOfPay				: String(4);
   			MOP_TYPE            : String(10);
            CURRENCY            : String(6);
   			
            YEARTODATEAMOUNT    : Decimal(15,2);
            TOTAMOUNT           : Decimal(15,2);
   };
    entity POSBYMATGRPVIEW as select  from POSANALYTICS{
   			key MaterialGroup @(title: 'Material Group'),
                YearOfPay @(title: 'Year'),
   			    sum(Amount) as Amount @(title: 'Total Sales'): Decimal(15,2)
                
   }   group by MaterialGroup , YearOfPay;
   entity POSBYMATGRPYEARLY as select  from POSANALYTICS{
   			key MaterialGroup @(title: 'Material Group'),
               key YearOfPay @(title: 'Year'),
   			sum(Amount) as Amount @(title: 'Total Sales'): Decimal(15,2),
               TOTAMOUNT @(title: 'Total Sales'): Decimal(15,2),
               YEARTODATEAMOUNT @(title: 'Year to Date Sales'): Decimal(15,2)
   } group by MaterialGroup, YearOfPay,TOTAMOUNT,YEARTODATEAMOUNT order by YearOfPay asc; 
   entity POSBYPRIMNW as select  from POSANALYTICS{
   			key PrimaryNetwork @(title: 'Primary Network'),
            key YearOfPay @(title: 'Year'),
   			sum(Amount) as Amount @(title: 'Total Sales'): Decimal(15,2),
            TOTAMOUNT @(title: 'Total Sales'): Decimal(15,2),
            YEARTODATEAMOUNT @(title: 'Year to Date Sales'): Decimal(15,2)
   } group by PrimaryNetwork,TOTAMOUNT,YearOfPay,YEARTODATEAMOUNT;
   entity POSBYPRIMNWBYYEAR as select  from POSANALYTICS{
   			key PrimaryNetwork @(title: 'Primary Network'),
               key YearOfPay @(title: 'Year'),
            
   			sum(Amount) as Amount @(title: 'Total Sales'): Decimal(15,2)
   } group by PrimaryNetwork,YearOfPay ;
   entity POSBYMOP as select  from POSANALYTICS{
   			key MOP_TYPE @(title: 'Method Of Payment'),
            key YearOfPay @(title: 'Year'),
            TOTAMOUNT @(title: 'Total Sales'): Decimal(15,2),
   			sum(Amount) as Amount @(title: 'Total Sales'): Decimal(15,2)
   } group by MOP_TYPE, YearOfPay, TOTAMOUNT order by YearOfPay asc ;
   
@cds.persistence.exists
    @Aggregation.ApplySupported.PropertyRestrictions: true
    entity NOOFPOSTRANSBYSITE {
        key   SITE           : String(10);
         COUNTOFTRANSACTIONS : Integer;
         
    }
   

   @Aggregation.ApplySupported.PropertyRestrictions : true
   entity POSBYSITE as select  from POSANALYTICS as POSAnalytics inner join NOOFPOSTRANSBYSITE as POSCount on POSAnalytics.Site = POSCount.SITE {
   			key POSAnalytics.Site @(title: 'Site'),
   			sum(POSAnalytics.Amount) as Amount @(title: 'Total Sales'): Decimal(15,2),
            POSAnalytics.TOTAMOUNT @(title: 'Total Sales'): Decimal(15,2),
            (POSCount.COUNTOFTRANSACTIONS) as CountOfTrans  : Integer
   } group by POSAnalytics.Site,POSAnalytics.TOTAMOUNT, POSCount.COUNTOFTRANSACTIONS;
@Aggregation.ApplySupported.PropertyRestrictions : true
@Search.searchable                               : true
entity Orders                       @(cds.persistence.skip : 'always')     as
    select from ReplenishmentOrders {
        key OrderNo,
        key Item,
            @Consumption.valueHelpDefinition : [{entity : {
                name    : 'SiteDetails',
                element : 'PrimaryNetwork'
            }}]
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Site.PrimaryNetwork     @(title : 'Primary Network'),
            Site.SubNetwork         @(title : 'Sub Network'),
            @Analytics.Dimension             : true
            @Consumption.semanticObject      : 'Sites'
            @Search.searchable               : true
            Site.Site               @(title : 'Site No'),
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Site.Acronym            @(title : 'Site Acronym'),
            Site.LocationGroup      @(title : 'Loc Grp'),
            Site.SiteType,
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Status,
            OrderType,
            TankNum                 @(title : 'Tank'),
            Suppl_Mat.MaterialId    @(title : 'Material'),
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Suppl_Mat.MaterialDesc  @(title : 'Material'),
            @Analytics.Measure               : true
            @Aggregation.default             : #SUM
            Suppl_Qty               @(title : 'Quantity')         : Decimal(13, 2),
            Suppl_Uom               @(title : 'Uom'),
            @Analytics.Dimension             : true
            Suppl_Date              @(title : 'Supply Date')      : Date,
            Suppl_Time              @(title : 'Supply Time'),
            @DefaultAggregation              : #SUM
            @EndUserText.label               : 'Total Quantity'
            Suppl_Qty as TotQty,
            @Analytics.Measure               : true
            @Aggregation.default             : #COUNT
            1         as ordercount @(title : 'Order Item Count') : Integer
    }
    where
        isStatusChgd = false;

@Aggregation.ApplySupported.PropertyRestrictions : true
@Search.searchable                               : true
entity PriorityOrders               @(cds.persistence.skip : 'always')     as
    select from ReplenishmentOrders {
        key OrderNo,
        key Item,
            @Consumption.valueHelpDefinition : [{entity : {
                name    : 'SiteDetails',
                element : 'PrimaryNetwork'
            }}]
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Site.PrimaryNetwork     @(title : 'Primary Network'),
            Site.SubNetwork         @(title : 'Sub Network'),
            @Analytics.Dimension             : true
            @Consumption.semanticObject      : 'Sites'
            @Search.searchable               : true
            Site.Site               @(title : 'Site No'),
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Site.Acronym            @(title : 'Site Acronym'),
            Site.LocationGroup      @(title : 'Loc Grp'),
            Site.SiteType,
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Status,
            OrderType,
            TankNum                 @(title : 'Tank'),
            Suppl_Mat.MaterialId    @(title : 'Material'),
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Suppl_Mat.MaterialDesc  @(title : 'Material'),
            @Analytics.Measure               : true
            @Aggregation.default             : #SUM
            Suppl_Qty               @(title : 'Quantity')         : Decimal(13, 2),
            Suppl_Uom               @(title : 'Uom'),
            @Analytics.Dimension             : true
            Suppl_Date              @(title : 'Supply Date')      : Date,
            Suppl_Time              @(title : 'Supply Time'),
            @DefaultAggregation              : #SUM
            @EndUserText.label               : 'Total Quantity'
            Suppl_Qty as TotQty,
            @Analytics.Measure               : true
            @Aggregation.default             : #COUNT
            1         as ordercount @(title : 'Order Item Count') : Integer
    }
    where
        isStatusChgd = false
        and (
               Suppl_Date = CURRENT_DATE
            or Suppl_Date = add_days(
                CURRENT_DATE, 1
            )
        );

@Aggregation.ApplySupported.PropertyRestrictions : true
entity CreatedReplOrders @(cds.persistence.skip : 'always')                as
    select distinct
        key (
                OrderNo
            ) as OrderId : String(15),
            Site.Site,
            OrderType,
            Suppl_Date
    from ReplenishmentOrders
    where
            isStatusChgd = false
        and Status       = 'CRT';

@Aggregation.ApplySupported.PropertyRestrictions : true
@Search.searchable                               : true
entity POSSales                         @(cds.persistence.skip : 'always') as
    select from SitePosHeader {
        key SiteTrnID  @(title : 'Tramsaction ID'),

            @Consumption.valueHelpDefinition : [{entity : {
                name    : 'SiteDetails',
                element : 'PrimaryNetwork'
            }}]
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Site.PrimaryNetwork         @(title : 'Primary Network'),

            TRN_TIMESTAMP  @(title : 'Transaction Date') ,

            @Analytics.Dimension             : true
            @Consumption.semanticObject      : 'Sites'
            @Search.searchable               : true
            Site.Site                   @(title : 'Site No'),
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Site.Acronym                @(title : 'Site Acronym'),
            Site.LocationGroup          @(title : 'Loc Grp'),
            Site.SiteType,
            @Analytics.Dimension             : true
            @Search.searchable               : true
            Items.MATERIAL              @(title : 'Material No'),

            @Analytics.Measure               : true
            @Aggregation.default             : #SUM
            @EndUserText.label               : 'Total Amount'
            Items.AMOUNT,
            @Analytics.Measure               : true
            @Aggregation.default             : #COUNT
            1             as transcount @(title : 'Transaction Count') : Integer
    };
 entity AmountPerPOSTrans as select  from SitePosItems{
   			key SiteTrnID @(title: 'Site Transaction ID'),
   			sum(AMOUNT) as Amount @(title: 'Total Sales'): Decimal(15,2)
   } group by SiteTrnID ;

@Aggregation.ApplySupported.PropertyRestrictions : true
@Search.searchable                               : true
entity POSSalesY2D  @(cds.persistence.skip : 'always')     as
    select from SitePosHeader as header inner join AmountPerPOSTrans as trans on header.SiteTrnID = trans.SiteTrnID {
            key header.SiteTrnID  @(title : 'Transaction ID'),
            
            
            @Consumption.valueHelpDefinition : [{entity : {
                name    : 'SiteDetails',
                element : 'PrimaryNetwork'
            }}]
            @Analytics.Dimension             : true
            @Search.searchable               : true
            header.Site.PrimaryNetwork     @(title : 'Primary Network'),
            header.Site.SubNetwork         @(title : 'Sub Network'),
            @Analytics.Dimension             : true
            @Consumption.semanticObject      : 'Sites'
            @Search.searchable               : true
            header.Site.Site              @(title : 'Site No'),
            @Analytics.Dimension             : true
            @Search.searchable               : true
            header.Site.Acronym            @(title : 'Site Acronym'),
            header.Site.LocationGroup      @(title : 'Loc Grp'),
            header.Site.SiteType,
            
            @Analytics.Dimension               : true
            header.MOP_TYPE                 @(title : 'Method of Payment') ,
            header.SYS_AUDIT_NO            @(title : 'Sys Audit No') ,
            
            header.TRN_TIMESTAMP   @(title : 'Transaction Date')  ,
            //Date(header.TRN_TIMESTAMP) as TransactDate   @(title : 'Transaction Date') : Date  ,
            header.Items.MATERIAL @(title : 'Material')  ,
            header.Items.MATERIAL.MaterialGroup @(title : 'Material Group')  ,
            @Analytics.Measure               : true
            @Aggregation.default             : #SUM
            trans.Amount            @(title : 'Gross Amount')
    }
    where
        Year(header.TRN_TIMESTAMP) = '2022';