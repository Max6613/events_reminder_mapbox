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

    static fromJson ( json ) {
        const reminder = new EventReminder( {} );

        for ( let key in json ) {
            if ( reminder.hasOwnProperty( key ) ){
                switch ( key ) {
                    case 'date_start':
                    case 'date_end':
                        reminder[ key ] = new Date( json[ key ] );
                        break;
                    default:
                        reminder[ key ] = json[ key ];
                        break;
                }
            }
        }
        return reminder;
    }
}