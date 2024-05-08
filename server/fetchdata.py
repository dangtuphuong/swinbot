import requests
import csv
from bs4 import BeautifulSoup

# URL of the FAQ page
url = "https://www.swinburneonline.edu.au/faqs/"

try:
    # Send a GET request to the URL
    response = requests.get(url)
    response.raise_for_status()  # Raise an exception for HTTP errors

    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(response.text, "html.parser")

    # Find all FAQ items
    faq_items = soup.find_all("div", class_="faq-item")

    # Initialize a list to store FAQ data
    faq_data = []

    # Loop through each FAQ item and extract the question and answer
    for faq_item in faq_items:
        question = faq_item.find("h3").text.strip()
        answer = faq_item.find("div", class_="faq-answer").text.strip()
        faq_data.append([question, answer])

    # Write the FAQ data to a CSV file
    with open("faq_data.csv", "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(["Question", "Answer"])  # Write header row
        writer.writerows(faq_data)  # Write FAQ data rows

    print("FAQ data has been successfully scraped and saved to faq_data.csv.")

except requests.RequestException as e:
    print("Error fetching data from the website:", e)
except Exception as e:
    print("An error occurred:", e)
