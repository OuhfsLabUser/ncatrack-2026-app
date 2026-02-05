import React, { useEffect, useState } from 'react';

const AOIEventViewer = () => {
    const [events, setEvents] = useState([]);

    const fetchEvents = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/events');
            const data = await response.json();
            setEvents(data);
        } catch (error) {
            console.error('Failed to fetch AOI events:', error);
        }
    };

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <h3>AOI Event Log</h3>
            <ul>
                {events.map((event, index) => (
                    <li key={index}>
                        [{event.timestamp}] {event.event_type} at ({event.coordinates.x}, {event.coordinates.y})
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default AOIEventViewer;
