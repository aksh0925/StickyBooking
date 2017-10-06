
//Added function to Date object to allow adjusting a date by a number of date part units
Date.prototype.adjust = function(part, amount){
    part = part.toLowerCase();
    
    var map = { 
                years: 'FullYear', months: 'Month', weeks: 'Hours', days: 'Hours', hours: 'Hours', 
                minutes: 'Minutes', seconds: 'Seconds', milliseconds: 'Milliseconds',
                utcyears: 'UTCFullYear', utcmonths: 'UTCMonth', weeks: 'UTCHours', utcdays: 'UTCHours', 
                utchours: 'UTCHours', utcminutes: 'UTCMinutes', utcseconds: 'UTCSeconds', utcmilliseconds: 'UTCMilliseconds'
            },
        mapPart = map[part];

    if(part == 'weeks' || part == 'utcweeks')
        amount *= 168;
    if(part == 'days' || part == 'utcdays')
        amount *= 24;
    
    this['set'+ mapPart]( this['get'+ mapPart]() + amount );

    return this;
}

//Added function to Date object to allow iterating between two dates
Date.prototype.each = function(endDate, part, step, fn, bind){
    let fromDate = new Date(this.getTime());
    let toDate = new Date(endDate.getTime());
    let pm = fromDate <= toDate? 1:-1;
    let i = 0;
    
    while( (pm === 1 && fromDate <= toDate) || (pm === -1 && fromDate >= toDate) ){
        if(fn.call(bind, fromDate, i, this) === false) break;
        i += step;
        fromDate.adjust(part, step*pm);
    }

    return this;
}