

from textblob import TextBlob


def get_sentiment(text):

    blob = TextBlob(text)
    sentiment = blob.sentiment.polarity

    return sentiment