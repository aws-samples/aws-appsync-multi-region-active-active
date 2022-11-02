import { onAddTodo } from '../graphql/subscriptions'
import { API } from 'aws-amplify'
import { useState } from 'react';
import { Heading, Alert } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';



export const Subscriptions = ({ todoData, handleTodoDelete }) => {

  const [newTodoSubscriptionMessage, setNewTodoSubscriptionMessage] = useState([])
  const [subscriptionVar, setSubscriptionVar] = useState()

  const handleTodoSubscription = async () => {
    try {
      const res = await API.graphql({
        query: onAddTodo,
        authToken: "custom-authorized"
      })
        .subscribe({
          next: newTodoSubMessage => {
            const todoDetails = {
              name: newTodoSubMessage.value.data.onAddTodo.name,
              description: newTodoSubMessage.value.data.onAddTodo.description,
              priority: newTodoSubMessage.value.data.onAddTodo.priority,
              createdAt: newTodoSubMessage.value.data.onAddTodo.createdAt,
              timeReceived: new Date().toJSON(),
              createdInRegion: newTodoSubMessage.value.data.onAddTodo.createdInRegion,
              status: newTodoSubMessage.value.data.onAddTodo.status,
            }

            setNewTodoSubscriptionMessage((curTodoMessage) => {
              return [...curTodoMessage, JSON.stringify(todoDetails)]
            })
          }
        })

      setSubscriptionVar(res)

    } catch (error) {
      console.log(error)
    }
  }

  const handleTodoUnSubscription = async () => {
    try {
      subscriptionVar.unsubscribe()
      setSubscriptionVar(false)
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div>
      <Heading level={3}>Todo Notifications</Heading>
      {subscriptionVar ? <button className="button-sub" onClick={handleTodoUnSubscription}>Unsubscribe</button> : <button className="button-sub" onClick={handleTodoSubscription}>Subscribe</button>
      }
      <h3> Subscribe to the new todos</h3>
      <div>
        {newTodoSubscriptionMessage ? newTodoSubscriptionMessage.map((row) => (<Alert margin="5px" width="100%" variation="success"><div key={row.name}>{row}</div></Alert>)) : ''}
      </div>
    </div >

  );
}


