export class EventReminder {
    title;
    description;
    date_start;
    date_end;
    latitude;
    longitude;

    constructor( data ) {
        for ( let key in data ) {
            if ( this.hasOwnProperty( key ) ){
                this[ key ] = data[ key ];
            }
        }
    }
}