def delete_user_account(user):
    # future: delete journals, moods, etc
    user.delete()