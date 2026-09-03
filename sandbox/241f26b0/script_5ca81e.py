
import datetime
import pytz

def get_current_times():
    """
    Reads the current UTC time and converts it to local times for several major US cities.
    """
    # Define the time zones for the requested locations
    timezones = {
        "Atlanta (EST/EDT)": 'America/New_York',  # Atlanta follows Eastern Time
        "Dallas (CST/CDT)": 'America/Chicago',    # Dallas follows Central Time
        "Denver (MST/MDT)": 'America/Denver',      # Denver follows Mountain Time
        "San Francisco (PST/PDT)": 'America/Los_Angeles' # San Francisco follows Pacific Time
    }
    
    # Get the current time in UTC as the base
    utc_now = datetime.datetime.now(pytz.utc)
    print(f"--- Current time objects generated based on UTC: {utc_now.strftime('%Y-%m-%d %H:%M:%S %Z')} ---")
    print("\n=========================================")
    
    # Get the current date and format the Day of Week and Time for each city
    for name, tz_str in timezones.items():
        # Localize the UTC time to the specific target timezone
        local_tz = pytz.timezone(tz_str)
        local_time = utc_now.astimezone(local_tz)
        
        # Format the output string
        # %A = Full weekday name, %I = Hour (12-hour clock), %p = AM/PM
        formatted_time = local_time.strftime("%A, %Y-%m-%d at %I:%M:%S %p")
        
        print(f"\n[{name}]")
        print(f"Day of Week: {local_time.strftime('%A')}")
        print(f"Time: {local_time.strftime('%I:%M:%S %p')} ({local_time.strftime('%Z')})")

if __name__ == "__main__":
    # Install pytz if necessary (important for clean execution)
    try:
        import librosa # Placeholder to check for installation context, usually not needed here
    except ImportError:
        pass # We assume pytz is available or handle installation if running in a strict environment

    try:
        get_current_times()
    except Exception as e:
        print(f"\nAn error occurred. Please ensure 'pytz' is installedpip install pytz`) and all necessary libraries are available.")
        print(f"Details: {e}")

